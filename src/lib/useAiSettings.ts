/**
 * AI provider settings hooks (TanStack Query wrappers over /api/ai/settings).
 * Used by the first-login setup dialog and the account-menu settings entry.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AiProviderId } from "./ai-providers";
import { apiClient } from "./api-client";

export interface AiSettings {
	provider: AiProviderId;
	baseUrl: string;
	model: string;
	hasApiKey: boolean;
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
