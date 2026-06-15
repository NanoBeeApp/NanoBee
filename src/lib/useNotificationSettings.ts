/**
 * Notification settings hooks (TanStack Query wrappers over
 * /api/notifications/settings). Used by the NotificationSettings component
 * on the /settings page.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types (must stay in sync with src/worker/routes/notification-settings.ts)
// ---------------------------------------------------------------------------

export type ImportanceThreshold = "low" | "normal" | "high";

export interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  /** Minutes from midnight UTC. null = DND disabled. */
  dndStart: number | null;
  /** Minutes from midnight UTC. null = DND disabled. */
  dndEnd: number | null;
  digestEnabled: boolean;
  /** HH:MM UTC */
  digestTime: string;
  importanceThreshold: ImportanceThreshold;
}

export const NOTIFICATION_SETTINGS_QUERY_KEY = ["notifications", "settings"] as const;

const API_PATH = "/api/notifications/settings";

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Load the signed-in user's notification settings.
 * `enabled` lets callers skip the fetch until the auth state is known.
 */
export function useNotificationSettings(enabled: boolean) {
  return useQuery({
    queryKey: NOTIFICATION_SETTINGS_QUERY_KEY,
    enabled,
    queryFn: async (): Promise<NotificationSettings | null> => {
      const res = await fetch(API_PATH);
      if (res.status === 401) return null;
      if (!res.ok) return null;
      const data = (await res.json()) as { settings: NotificationSettings };
      return data.settings;
    },
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Mutation
// ---------------------------------------------------------------------------

/** Save mutation; refreshes the cached settings on success. */
export function useSaveNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NotificationSettings): Promise<NotificationSettings> => {
      const res = await fetch(API_PATH, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to save notification settings");
      }
      const data = (await res.json()) as { settings: NotificationSettings };
      return data.settings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<NotificationSettings | null>(
        NOTIFICATION_SETTINGS_QUERY_KEY,
        data,
      );
    },
  });
}
