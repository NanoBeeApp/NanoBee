/**
 * /api/ai/settings — per-user AI provider configuration.
 * GET returns the saved settings (key masked to a boolean) plus the backend
 * defaults; PUT validates and upserts them. Both require a signed-in session.
 * Raw API keys are accepted on PUT only and are never echoed back.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
	AI_PROVIDER_IDS,
	DEFAULT_AI_PROVIDER,
	getProviderInfo,
	WEB_SEARCH_PROVIDER_IDS,
	type AiProviderInfo,
} from "../../lib/ai-providers";
import type { Env } from "../api-worker";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";
import { CONFIG } from "../config";
import {
	getStoredProviderKey,
	getUserAiSettings,
	saveUserAiSettings,
} from "../ai/settings";
import { listProviderModels } from "../ai/models";
import { pingChatModel } from "../ai/client";

const FIELD_MAX = CONFIG.AI.MAX_FIELD_LENGTH;

/**
 * Resolve which API key to probe a provider with, never returned to the client:
 * caller-supplied key → the user's stored key for the same provider → the
 * built-in OpenRouter key. Shared by the /models and /test endpoints.
 */
async function resolveProbeKey(
	env: Env,
	userId: string,
	info: AiProviderInfo,
	bodyApiKey: string | undefined,
): Promise<string | null> {
	let apiKey = bodyApiKey?.trim() || null;
	if (!apiKey) {
		const stored = await getStoredProviderKey(env, userId);
		if (stored && stored.provider === info.id) apiKey = stored.apiKey;
	}
	if (!apiKey && info.id === DEFAULT_AI_PROVIDER) {
		apiKey = env.OPENROUTER_API_KEY ?? null;
	}
	return apiKey;
}

const putSchema = z.object({
	provider: z.enum(AI_PROVIDER_IDS),
	// undefined = keep the stored key, "" = clear it, string = replace it
	apiKey: z.string().max(FIELD_MAX).optional(),
	baseUrl: z
		.union([z.literal(""), z.url({ protocol: /^https?$/ })])
		.optional()
		.default(""),
	model: z.string().max(FIELD_MAX).optional().default(""),
	// Web-search key; same keep/clear/replace semantics as apiKey. The key
	// belongs to the chosen web-search provider below.
	webSearchKey: z.string().max(FIELD_MAX).optional(),
	// Chosen web-search provider (Tavily / Brave / Serper / Exa).
	webSearchProvider: z.enum(WEB_SEARCH_PROVIDER_IDS).optional(),
});

const modelsSchema = z.object({
	provider: z.enum(AI_PROVIDER_IDS),
	// Caller-supplied key takes priority; blank means "use my stored key".
	apiKey: z.string().max(FIELD_MAX).optional(),
	baseUrl: z
		.union([z.literal(""), z.url({ protocol: /^https?$/ })])
		.optional()
		.default(""),
});

const testSchema = z.object({
	provider: z.enum(AI_PROVIDER_IDS),
	apiKey: z.string().max(FIELD_MAX).optional(),
	baseUrl: z
		.union([z.literal(""), z.url({ protocol: /^https?$/ })])
		.optional()
		.default(""),
	// Required to ping providers without a model-list endpoint.
	model: z.string().max(FIELD_MAX).optional().default(""),
});

export const aiSettingsRoutes = new Hono<{ Bindings: Env }>()
	// GET /api/ai/settings — saved settings + defaults (401 when signed out)
	.get("/settings", async (c) => {
		const token = getSessionToken(c);
		const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const settings = await getUserAiSettings(c.env.DB, user.id);
		const def = getProviderInfo(DEFAULT_AI_PROVIDER);
		return c.json({
			configured: settings !== null,
			settings,
			defaults: { provider: def.id, model: def.defaultModel },
		});
	})

	// PUT /api/ai/settings — create/update the user's provider settings
	.put("/settings", zValidator("json", putSchema), async (c) => {
		const token = getSessionToken(c);
		const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const body = c.req.valid("json");
		const info = getProviderInfo(body.provider);
		const baseUrl = (body.baseUrl ?? "").trim();
		const model = (body.model ?? "").trim();
		let apiKey = body.apiKey?.trim();

		// "custom" has no usable defaults — the user must supply the host.
		if (info.id === "custom" && !baseUrl) {
			return c.json({ error: "自定义供应商需要填写 API Host" }, 400);
		}

		const existing = await getUserAiSettings(c.env.DB, user.id);
		// A stored key belongs to the provider it was entered for; switching
		// providers without sending a new key invalidates it instead of
		// silently reusing it against a different API.
		if (apiKey === undefined && existing && existing.provider !== info.id) {
			apiKey = "";
		}
		// Providers without a built-in fallback key need a key now or one on file.
		if (!info.keyOptional && !apiKey) {
			const keptKey =
				apiKey === undefined && existing?.provider === info.id && existing.hasApiKey;
			if (!keptKey) {
				return c.json({ error: `${info.label} 需要填写 API Key` }, 400);
			}
		}

		// The stored web-search key belongs to the provider it was entered for.
		// Switching web-search providers without a new key invalidates it rather
		// than reusing it against a different API.
		let webSearchKey = body.webSearchKey?.trim();
		if (
			webSearchKey === undefined &&
			body.webSearchProvider !== undefined &&
			existing &&
			existing.webSearchProvider !== body.webSearchProvider
		) {
			webSearchKey = "";
		}

		try {
			await saveUserAiSettings(c.env, user.id, {
				provider: info.id,
				baseUrl,
				model,
				apiKey,
				webSearchKey,
				webSearchProvider: body.webSearchProvider,
			});
		} catch (error) {
			console.error("[API] PUT /api/ai/settings failed:", String(error));
			return c.json({ error: "保存失败，请稍后重试" }, 500);
		}

		const settings = await getUserAiSettings(c.env.DB, user.id);
		console.log("[API] PUT /api/ai/settings, user:", user.id, "provider:", info.id);
		return c.json({ configured: true, settings });
	})

	// POST /api/ai/models — auto-fetch the provider's available model list.
	// Uses the caller-supplied key, else the user's stored key for the same
	// provider, else the built-in key for OpenRouter. Never echoes the key.
	.post("/models", zValidator("json", modelsSchema), async (c) => {
		const token = getSessionToken(c);
		const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const body = c.req.valid("json");
		const info = getProviderInfo(body.provider);
		if (!info.canListModels) {
			return c.json({ error: `${info.label} 不支持自动获取模型列表，请手动填写` }, 400);
		}

		const baseUrl = (body.baseUrl ?? "").trim() || info.defaultBaseUrl;
		if (!baseUrl) {
			return c.json({ error: "请先填写 API Host" }, 400);
		}

		// Resolve which key to use without ever returning it to the client.
		const apiKey = await resolveProbeKey(c.env, user.id, info, body.apiKey);
		if (!apiKey && !info.keyOptional) {
			return c.json({ error: `${info.label} 需要先填写 API Key 才能获取模型` }, 400);
		}

		try {
			const models = await listProviderModels({
				protocol: info.protocol,
				baseUrl,
				apiKey,
			});
			console.log(
				"[API] POST /api/ai/models, user:",
				user.id,
				"provider:",
				info.id,
				"count:",
				models.length,
			);
			return c.json({ models });
		} catch (error) {
			console.error("[API] POST /api/ai/models failed:", String(error));
			return c.json({ error: "获取模型列表失败，请检查 API Key 与 Host" }, 502);
		}
	})

	// POST /api/ai/test — probe the provider with the resolved key to confirm
	// the key/host/model tuple actually works. Returns {ok, latencyMs, modelCount?}
	// on success or {ok:false, error} on failure (HTTP 200 either way — the
	// request succeeded; it's the *connection* that may have failed).
	.post("/test", zValidator("json", testSchema), async (c) => {
		const token = getSessionToken(c);
		const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const body = c.req.valid("json");
		const info = getProviderInfo(body.provider);
		const baseUrl = (body.baseUrl ?? "").trim() || info.defaultBaseUrl;
		if (!baseUrl) return c.json({ error: "请先填写 API Host" }, 400);

		const apiKey = await resolveProbeKey(c.env, user.id, info, body.apiKey);
		if (!apiKey && !info.keyOptional) {
			return c.json({ ok: false, error: `${info.label} 需要先填写 API Key` });
		}

		const started = Date.now();
		try {
			if (info.canListModels) {
				// Listing models is a cheap, token-free connectivity check.
				const models = await listProviderModels({ protocol: info.protocol, baseUrl, apiKey });
				const latencyMs = Date.now() - started;
				console.log("[API] POST /api/ai/test ok, user:", user.id, "provider:", info.id, "models:", models.length);
				return c.json({ ok: true, latencyMs, modelCount: models.length });
			}
			// No model-list endpoint: send a 1-token chat ping instead.
			const model = (body.model ?? "").trim() || info.defaultModel;
			await pingChatModel({
				provider: info.id,
				protocol: info.protocol,
				baseUrl,
				model,
				apiKey,
				source: "user",
			});
			const latencyMs = Date.now() - started;
			console.log("[API] POST /api/ai/test ok (ping), user:", user.id, "provider:", info.id);
			return c.json({ ok: true, latencyMs });
		} catch (error) {
			console.warn("[API] POST /api/ai/test failed:", info.id, String(error));
			// Surface a short, actionable reason without leaking the raw key.
			const raw = String(error);
			const status = raw.match(/returned (\d{3})/)?.[1];
			const reason = status
				? `连接失败 (${status})，请检查 API Key、Host 与模型`
				: "连接失败，请检查 API Key、Host 与网络";
			return c.json({ ok: false, error: reason });
		}
	});
