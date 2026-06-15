/**
 * /api/compare — multi-model compare backend.
 *
 *  - GET  /providers      — the provider catalog + which ones this user has a
 *                           key for (so the picker can flag "needs key").
 *  - PUT  /keys           — save one provider's API key/host (signed-in).
 *  - DELETE /keys/:id     — remove one provider's saved key (signed-in).
 *  - POST /stream         — SSE: stream ONE model's answer for ONE column.
 *                           The frontend fires N of these concurrently (one per
 *                           column) so columns return independently and a single
 *                           failure never blocks the others.
 *
 * Keys never leave the worker. Each column resolves its own config via
 * `resolveCompareConfig`; a column whose provider has no usable key gets an
 * `error` event with code "no_key" instead of a thrown request.
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
	AI_PROVIDERS,
	AI_PROVIDER_IDS,
	getProviderInfo,
} from "../../lib/ai-providers";
import type { Env } from "../api-worker";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";
import { CONFIG } from "../config";
import { streamAgentText, type AiChatMessage } from "../ai/client";
import {
	deleteUserProviderKey,
	listUserProviderKeys,
	resolveCompareConfig,
	saveUserProviderKey,
} from "../ai/provider-keys";

const FIELD_MAX = CONFIG.AI.MAX_FIELD_LENGTH;

/** Turn a provider error into a short, key-safe reason for the column UI. */
function shortReason(error: unknown): string {
	const raw = String(error);
	const status = raw.match(/returned (\d{3})/)?.[1];
	if (status) return `请求失败 (${status})，请检查 Key 与模型`;
	if (/timeout|aborted/i.test(raw)) return "请求超时，点重试再试一次";
	return "请求失败，请稍后重试";
}

const keysSchema = z.object({
	provider: z.enum(AI_PROVIDER_IDS),
	// undefined = keep stored key, "" = clear, string = replace
	apiKey: z.string().max(FIELD_MAX).optional(),
	baseUrl: z
		.union([z.literal(""), z.url({ protocol: /^https?$/ })])
		.optional()
		.default(""),
});

const streamSchema = z.object({
	provider: z.enum(AI_PROVIDER_IDS),
	model: z.string().min(1, "model required").max(FIELD_MAX),
	messages: z
		.array(
			z.object({
				role: z.enum(["system", "user", "assistant"]),
				content: z.string().min(1).max(8000),
			}),
		)
		.min(1)
		.max(40),
});

export const compareRoutes = new Hono<{ Bindings: Env }>()
	// GET /api/compare/providers — catalog + this user's configured providers.
	.get("/providers", async (c) => {
		const token = getSessionToken(c);
		const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
		const configured = user ? await listUserProviderKeys(c.env.DB, user.id) : [];
		return c.json({
			signedIn: user !== null,
			providers: AI_PROVIDERS.map((p) => ({
				id: p.id,
				label: p.label,
				keyOptional: p.keyOptional,
				hint: p.hint,
				defaultModel: p.defaultModel,
			})),
			configured,
		});
	})

	// PUT /api/compare/keys — save one provider's key/host.
	.put("/keys", zValidator("json", keysSchema), async (c) => {
		const token = getSessionToken(c);
		const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const body = c.req.valid("json");
		const info = getProviderInfo(body.provider);
		const baseUrl = (body.baseUrl ?? "").trim();
		const apiKey = body.apiKey?.trim();

		if (info.id === "custom" && !baseUrl) {
			return c.json({ error: "自定义供应商需要填写 API Host" }, 400);
		}
		// Non-optional providers need a key now or one already on file.
		if (!info.keyOptional && !apiKey) {
			const existing = await listUserProviderKeys(c.env.DB, user.id);
			const onFile = existing.find((e) => e.provider === info.id)?.hasApiKey;
			if (!onFile) return c.json({ error: `${info.label} 需要填写 API Key` }, 400);
		}

		try {
			await saveUserProviderKey(c.env, user.id, { provider: info.id, baseUrl, apiKey });
		} catch (error) {
			console.error("[API] PUT /api/compare/keys failed:", String(error));
			return c.json({ error: "保存失败，请稍后重试" }, 500);
		}
		const configured = await listUserProviderKeys(c.env.DB, user.id);
		console.log("[API] PUT /api/compare/keys, user:", user.id, "provider:", info.id);
		return c.json({ configured });
	})

	// DELETE /api/compare/keys/:provider — remove one provider's saved key.
	.delete("/keys/:provider", async (c) => {
		const token = getSessionToken(c);
		const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const raw = c.req.param("provider");
		if (!AI_PROVIDER_IDS.includes(raw as (typeof AI_PROVIDER_IDS)[number])) {
			return c.json({ error: "Unknown provider" }, 400);
		}
		await deleteUserProviderKey(c.env.DB, user.id, getProviderInfo(raw).id);
		const configured = await listUserProviderKeys(c.env.DB, user.id);
		console.log("[API] DELETE /api/compare/keys, user:", user.id, "provider:", raw);
		return c.json({ configured });
	})

	// POST /api/compare/stream — stream one model's answer for one column (SSE).
	// `token` events carry text deltas; a final `done` event carries the elapsed
	// time; failures (incl. no key) arrive as an `error` event with a code.
	.post("/stream", zValidator("json", streamSchema), async (c) => {
		const body = c.req.valid("json");
		const token = getSessionToken(c);
		const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
		const info = getProviderInfo(body.provider);
		const cfg = await resolveCompareConfig(c.env, user?.id ?? null, info.id, body.model);

		console.log(
			"[API] POST /api/compare/stream, provider:",
			info.id, "model:", body.model, "hasKey:", cfg !== null,
		);

		return streamSSE(c, async (stream) => {
			if (!cfg) {
				await stream.writeSSE({
					event: "error",
					data: JSON.stringify({ code: "no_key", message: `${info.label} 需要先配置 API Key` }),
				});
				return;
			}
			const started = Date.now();
			try {
				await streamAgentText(cfg, body.messages as AiChatMessage[], async (delta) => {
					await stream.writeSSE({ event: "token", data: JSON.stringify(delta) });
				});
				await stream.writeSSE({
					event: "done",
					data: JSON.stringify({ durationMs: Date.now() - started }),
				});
			} catch (error) {
				console.warn("[API] compare stream failed:", info.id, String(error));
				await stream.writeSSE({
					event: "error",
					data: JSON.stringify({ code: "request_failed", message: shortReason(error) }),
				});
			}
		});
	});
