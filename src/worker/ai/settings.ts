/**
 * Per-user AI provider settings: D1 repository + runtime config resolution.
 * The chat pipeline asks `resolveAiConfig` which provider/model/key to use;
 * users without settings (or signed-out visitors) get the backend default —
 * OpenRouter + Gemini 3.5 Flash with NanoBee's built-in OPENROUTER_API_KEY.
 */

import type { D1Database } from "@cloudflare/workers-types";
import {
	DEFAULT_AI_PROVIDER,
	DEFAULT_WEB_SEARCH_PROVIDER,
	getProviderInfo,
	getWebSearchProviderInfo,
	type AiProtocol,
	type AiProviderId,
	type WebSearchProviderId,
} from "../../lib/ai-providers";
import type { Env } from "../api-worker";
import { decryptSecret, encryptSecret } from "./crypto";

interface SettingsRow {
	provider: string;
	base_url: string;
	model: string;
	api_key_enc: string | null;
	web_search_key_enc: string | null;
	web_search_provider: string;
}

/** What the settings API returns to the client (never the raw key). */
export interface UserAiSettings {
	provider: AiProviderId;
	baseUrl: string;
	model: string;
	hasApiKey: boolean;
	hasWebSearchKey: boolean;
	webSearchProvider: WebSearchProviderId;
}

/** Fully-resolved config the chat pipeline uses to call the model. */
export interface AiRuntimeConfig {
	provider: AiProviderId;
	protocol: AiProtocol;
	baseUrl: string;
	model: string;
	apiKey: string | null;
	/** "user" = the user's own settings row, "default" = backend default. */
	source: "user" | "default";
}

export async function getUserAiSettings(
	db: D1Database,
	userId: string,
): Promise<UserAiSettings | null> {
	const row = await db
		.prepare(
			"SELECT provider, base_url, model, api_key_enc, web_search_key_enc, web_search_provider FROM user_ai_settings WHERE user_id = ?",
		)
		.bind(userId)
		.first<SettingsRow>();
	if (!row) return null;
	return {
		provider: getProviderInfo(row.provider).id,
		baseUrl: row.base_url,
		model: row.model,
		hasApiKey: row.api_key_enc !== null,
		hasWebSearchKey: row.web_search_key_enc !== null,
		webSearchProvider: getWebSearchProviderInfo(row.web_search_provider).id,
	};
}

/**
 * The user's stored provider + decrypted API key, or null when none is saved.
 * Used by the model-list endpoint, which may need the key for a provider the
 * caller is *about* to switch to (only valid when it matches the stored one).
 */
export async function getStoredProviderKey(
	env: Env,
	userId: string,
): Promise<{ provider: AiProviderId; apiKey: string | null } | null> {
	const row = await env.DB.prepare(
		"SELECT provider, base_url, model, api_key_enc FROM user_ai_settings WHERE user_id = ?",
	)
		.bind(userId)
		.first<SettingsRow>();
	if (!row) return null;
	let apiKey: string | null = null;
	if (row.api_key_enc && env.AUTH_SECRET) {
		apiKey = await decryptSecret(row.api_key_enc, env.AUTH_SECRET);
	}
	return { provider: getProviderInfo(row.provider).id, apiKey };
}

export interface SaveAiSettingsInput {
	provider: AiProviderId;
	baseUrl: string;
	model: string;
	/** undefined = keep the stored key, "" = clear it, string = replace it. */
	apiKey?: string;
	/** Web-search key; same keep/clear/replace semantics as apiKey. */
	webSearchKey?: string;
	/** Chosen web-search provider; defaults to the previous value when omitted. */
	webSearchProvider?: WebSearchProviderId;
}

/**
 * Upsert plumbing for one encrypted-key column: undefined keeps the stored
 * value, "" clears it, any other string is encrypted and stored.
 */
async function keyUpsert(
	input: string | undefined,
	column: string,
	env: Env,
): Promise<{ clause: string; value: string | null }> {
	if (input === undefined) return { clause: column, value: null };
	if (input === "") return { clause: `excluded.${column}`, value: null };
	if (!env.AUTH_SECRET) {
		// Without the secret we cannot store the key safely — fail loudly
		// instead of silently downgrading to plaintext.
		throw new Error("AUTH_SECRET is required to store API keys encrypted");
	}
	return { clause: `excluded.${column}`, value: await encryptSecret(input, env.AUTH_SECRET) };
}

export async function saveUserAiSettings(
	env: Env,
	userId: string,
	input: SaveAiSettingsInput,
): Promise<void> {
	const aiKey = await keyUpsert(input.apiKey, "api_key_enc", env);
	const wsKey = await keyUpsert(input.webSearchKey, "web_search_key_enc", env);
	// undefined => keep the stored provider on conflict (default for new rows).
	const wsProvider = input.webSearchProvider ?? DEFAULT_WEB_SEARCH_PROVIDER;
	const wsProviderClause =
		input.webSearchProvider === undefined ? "web_search_provider" : "excluded.web_search_provider";

	await env.DB.prepare(
		`INSERT INTO user_ai_settings (user_id, provider, base_url, model, api_key_enc, web_search_key_enc, web_search_provider)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(user_id) DO UPDATE SET
		   provider = excluded.provider,
		   base_url = excluded.base_url,
		   model = excluded.model,
		   api_key_enc = ${aiKey.clause},
		   web_search_key_enc = ${wsKey.clause},
		   web_search_provider = ${wsProviderClause},
		   updated_at = unixepoch()`,
	)
		.bind(userId, input.provider, input.baseUrl, input.model, aiKey.value, wsKey.value, wsProvider)
		.run();
}

/**
 * The web-search credential for a request: the user's own stored provider + key
 * when present, otherwise NanoBee's built-in default (Tavily via the
 * TAVILY_API_KEY binding). The caller injects the key under the returned
 * provider's secret-param name (`<provider>_api_key`) in the data-hub source.
 */
export async function resolveWebSearchKey(
	env: Env,
	userId: string | null,
): Promise<{ provider: WebSearchProviderId; key: string } | null> {
	if (userId) {
		const row = await env.DB.prepare(
			"SELECT web_search_key_enc, web_search_provider FROM user_ai_settings WHERE user_id = ?",
		)
			.bind(userId)
			.first<{ web_search_key_enc: string | null; web_search_provider: string }>();
		if (row?.web_search_key_enc && env.AUTH_SECRET) {
			const key = await decryptSecret(row.web_search_key_enc, env.AUTH_SECRET);
			if (key) return { provider: getWebSearchProviderInfo(row.web_search_provider).id, key };
		}
	}
	// Built-in fallback is Tavily-only.
	const key = env.TAVILY_API_KEY ?? null;
	return key ? { provider: DEFAULT_WEB_SEARCH_PROVIDER, key } : null;
}

/** Backend default config (OpenRouter + Gemini 3.5 Flash, built-in key). */
function defaultConfig(env: Env): AiRuntimeConfig {
	const info = getProviderInfo(DEFAULT_AI_PROVIDER);
	return {
		provider: info.id,
		protocol: info.protocol,
		baseUrl: info.defaultBaseUrl,
		model: info.defaultModel,
		apiKey: env.OPENROUTER_API_KEY ?? null,
		source: "default",
	};
}

/**
 * Resolve the effective AI config for a request.
 * Falls back to the backend default when the user has no settings row,
 * and to the built-in key when an OpenRouter user left the key blank.
 */
export async function resolveAiConfig(
	env: Env,
	userId: string | null,
): Promise<AiRuntimeConfig> {
	if (!userId) return defaultConfig(env);

	const row = await env.DB.prepare(
		"SELECT provider, base_url, model, api_key_enc FROM user_ai_settings WHERE user_id = ?",
	)
		.bind(userId)
		.first<SettingsRow>();
	if (!row) return defaultConfig(env);

	const info = getProviderInfo(row.provider);
	let apiKey: string | null = null;
	if (row.api_key_enc && env.AUTH_SECRET) {
		apiKey = await decryptSecret(row.api_key_enc, env.AUTH_SECRET);
	}
	if (!apiKey && info.id === DEFAULT_AI_PROVIDER) {
		// OpenRouter users without their own key ride on NanoBee's built-in key.
		apiKey = env.OPENROUTER_API_KEY ?? null;
	}

	return {
		provider: info.id,
		protocol: info.protocol,
		baseUrl: row.base_url || info.defaultBaseUrl,
		model: row.model || info.defaultModel,
		apiKey,
		source: "user",
	};
}
