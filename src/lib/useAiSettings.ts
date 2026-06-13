/**
 * AI provider settings hooks (TanStack Query wrappers over /api/ai/settings).
 * Used by the first-login setup dialog and the account-menu settings entry.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AiProviderId, WebSearchProviderId } from "./ai-providers";
import { apiClient } from "./api-client";

export interface AiSettings {
	provider: AiProviderId;
	baseUrl: string;
	model: string;
	hasApiKey: boolean;
	hasWebSearchKey: boolean;
	webSearchProvider: WebSearchProviderId;
}

export interface AiSettingsResponse {
	configured: boolean;
	settings: AiSettings | null;
	defaults: { provider: AiProviderId; model: string };
}

export const AI_SETTINGS_QUERY_KEY = ["ai", "settings"] as const;

/**
 * Saved AI settings of the signed-in user (null when signed out).
 * `enabled` lets callers skip the request until the auth state is known.
 */
export function useAiSettings(enabled: boolean) {
	return useQuery({
		queryKey: AI_SETTINGS_QUERY_KEY,
		enabled,
		queryFn: async (): Promise<AiSettingsResponse | null> => {
			const res = await apiClient.ai.settings.$get();
			if (!res.ok) return null;
			return (await res.json()) as AiSettingsResponse;
		},
		staleTime: 60_000,
	});
}

export interface SaveAiSettingsInput {
	provider: AiProviderId;
	/** undefined = keep the stored key, "" = clear it, string = replace it. */
	apiKey?: string;
	baseUrl?: string;
	model?: string;
	/** Web-search key; same keep/clear/replace semantics as apiKey. */
	webSearchKey?: string;
	/** Chosen web-search provider (Tavily / Brave / Serper / Exa). */
	webSearchProvider?: WebSearchProviderId;
}

export interface FetchModelsInput {
	provider: AiProviderId;
	/** Blank = use the stored key (or built-in key for OpenRouter). */
	apiKey?: string;
	baseUrl?: string;
}

/**
 * Fetch the provider's available model list from the backend (which talks to
 * the provider so the key never leaves the server). Returns model ids; throws
 * with the server's error message on failure so the form can surface it.
 */
export function useFetchModels() {
	return useMutation({
		mutationFn: async (input: FetchModelsInput): Promise<string[]> => {
			const res = await apiClient.ai.models.$post({ json: input });
			if (!res.ok) {
				const data = (await res.json().catch(() => null)) as { error?: string } | null;
				throw new Error(data?.error ?? "获取模型列表失败");
			}
			const data = (await res.json()) as { models: string[] };
			return data.models;
		},
	});
}

export interface TestConnectionInput {
	provider: AiProviderId;
	apiKey?: string;
	baseUrl?: string;
	model?: string;
}

export interface TestConnectionResult {
	ok: boolean;
	latencyMs?: number;
	modelCount?: number;
	error?: string;
}

/**
 * Probe the provider with the current key/host/model to confirm it works.
 * The backend always answers 200 with `{ ok, ... }`; a failed *connection*
 * comes back as `{ ok:false, error }`, not a thrown error.
 */
export function useTestConnection() {
	return useMutation({
		mutationFn: async (input: TestConnectionInput): Promise<TestConnectionResult> => {
			const res = await apiClient.ai.test.$post({ json: input });
			if (!res.ok) {
				const data = (await res.json().catch(() => null)) as { error?: string } | null;
				return { ok: false, error: data?.error ?? "连接测试失败" };
			}
			return (await res.json()) as TestConnectionResult;
		},
	});
}

/** Save mutation; refreshes the cached settings on success. */
export function useSaveAiSettings() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: SaveAiSettingsInput) => {
			const res = await apiClient.ai.settings.$put({ json: input });
			if (!res.ok) {
				const data = (await res.json().catch(() => null)) as { error?: string } | null;
				throw new Error(data?.error ?? "保存失败，请稍后重试");
			}
			return (await res.json()) as { configured: boolean; settings: AiSettings };
		},
		onSuccess: (data) => {
			// Write the server response straight into the cache so dependent UI
			// (e.g. the first-login dialog) reacts immediately, without waiting
			// for an invalidation refetch.
			queryClient.setQueryData<AiSettingsResponse | null>(
				AI_SETTINGS_QUERY_KEY,
				(old) => (old ? { ...old, configured: true, settings: data.settings } : old),
			);
		},
	});
}
