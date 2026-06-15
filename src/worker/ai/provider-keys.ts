/**
 * Per-user, per-provider API key vault for the multi-model compare page.
 * Independent of `settings.ts` (which holds the single main-chat provider):
 * here a user can store one key per provider so compare can run models from
 * several providers side by side. Keys are AES-256-GCM encrypted at rest.
 *
 * `resolveCompareConfig` is the compare equivalent of `resolveAiConfig`: given a
 * provider + model, it returns the runtime config to call that model, or null
 * when the provider has no usable key (the column then shows a "configure key"
 * state). OpenRouter falls back to NanoBee's built-in key.
 */

import type { D1Database } from "@cloudflare/workers-types";
import {
	DEFAULT_AI_PROVIDER,
	getProviderInfo,
	type AiProviderId,
} from "../../lib/ai-providers";
import type { Env } from "../api-worker";
import type { AiRuntimeConfig } from "./settings";
import { decryptSecret, encryptSecret } from "./crypto";

interface KeyRow {
	provider: string;
	base_url: string;
	api_key_enc: string | null;
}

/** What the compare API returns per provider the user has configured (no key). */
export interface ProviderKeyStatus {
	provider: AiProviderId;
	baseUrl: string;
	hasApiKey: boolean;
}

/** List the providers this user has saved a key/host for (key masked). */
export async function listUserProviderKeys(
	db: D1Database,
	userId: string,
): Promise<ProviderKeyStatus[]> {
	const { results } = await db
		.prepare(
			"SELECT provider, base_url, api_key_enc FROM user_provider_keys WHERE user_id = ? ORDER BY provider",
		)
		.bind(userId)
		.all<KeyRow>();
	return (results ?? []).map((r) => ({
		provider: getProviderInfo(r.provider).id,
		baseUrl: r.base_url,
		hasApiKey: r.api_key_enc !== null,
	}));
}

export interface SaveProviderKeyInput {
	provider: AiProviderId;
	baseUrl: string;
	/** undefined = keep the stored key, "" = clear it, string = replace it. */
	apiKey?: string;
}

/** Upsert one provider's key/host for a user (same keep/clear/replace as chat). */
export async function saveUserProviderKey(
	env: Env,
	userId: string,
	input: SaveProviderKeyInput,
): Promise<void> {
	// undefined keeps the stored cipher on conflict; "" clears it; else encrypt.
	let clause = "api_key_enc"; // keep
	let value: string | null = null;
	if (input.apiKey === "") {
		clause = "excluded.api_key_enc";
		value = null;
	} else if (input.apiKey !== undefined) {
		if (!env.AUTH_SECRET) {
			throw new Error("AUTH_SECRET is required to store API keys encrypted");
		}
		clause = "excluded.api_key_enc";
		value = await encryptSecret(input.apiKey, env.AUTH_SECRET);
	}

	await env.DB.prepare(
		`INSERT INTO user_provider_keys (user_id, provider, base_url, api_key_enc)
		 VALUES (?, ?, ?, ?)
		 ON CONFLICT(user_id, provider) DO UPDATE SET
		   base_url = excluded.base_url,
		   api_key_enc = ${clause},
		   updated_at = unixepoch()`,
	)
		.bind(userId, input.provider, input.baseUrl, value)
		.run();
}

/** Remove a provider's saved key for a user. */
export async function deleteUserProviderKey(
	db: D1Database,
	userId: string,
	provider: AiProviderId,
): Promise<void> {
	await db
		.prepare("DELETE FROM user_provider_keys WHERE user_id = ? AND provider = ?")
		.bind(userId, provider)
		.run();
}

/**
 * Resolve the runtime config to call one (provider, model) for a compare column.
 * Returns null when the provider has no usable key — the caller turns that into
 * a "needs key" column state instead of a hard error. OpenRouter without a stored
 * key rides on NanoBee's built-in OPENROUTER_API_KEY.
 */
export async function resolveCompareConfig(
	env: Env,
	userId: string | null,
	provider: AiProviderId,
	model: string,
): Promise<AiRuntimeConfig | null> {
	const info = getProviderInfo(provider);
	let baseUrl = info.defaultBaseUrl;
	let apiKey: string | null = null;

	if (userId) {
		const row = await env.DB.prepare(
			"SELECT provider, base_url, api_key_enc FROM user_provider_keys WHERE user_id = ? AND provider = ?",
		)
			.bind(userId, info.id)
			.first<KeyRow>();
		if (row) {
			baseUrl = row.base_url || info.defaultBaseUrl;
			if (row.api_key_enc && env.AUTH_SECRET) {
				apiKey = await decryptSecret(row.api_key_enc, env.AUTH_SECRET);
			}
		}
	}

	// OpenRouter users without their own key ride on NanoBee's built-in key.
	if (!apiKey && info.id === DEFAULT_AI_PROVIDER) {
		apiKey = env.OPENROUTER_API_KEY ?? null;
	}
	if (!apiKey) return null;

	return {
		provider: info.id,
		protocol: info.protocol,
		baseUrl: baseUrl || info.defaultBaseUrl,
		model: model || info.defaultModel,
		apiKey,
		source: userId ? "user" : "default",
	};
}
