# src/lib/useNotificationSettings.ts

## Responsibility

TanStack Query hooks for the `/api/notifications/settings` endpoint.

- `useNotificationSettings(enabled)` — fetch (GET) the user's notification settings.
- `useSaveNotificationSettings()` — mutation (PUT) that saves and updates the cache.

## Exports

- `NotificationSettings` — TypeScript type mirroring the backend response.
- `ImportanceThreshold` — `'low' | 'normal' | 'high'` union.
- `NOTIFICATION_SETTINGS_QUERY_KEY` — stable array key for cache invalidation.
- `useNotificationSettings(enabled)` — TanStack Query `useQuery` wrapper.
- `useSaveNotificationSettings()` — TanStack Query `useMutation` wrapper.

## Key notes

- Does **not** use the typed Hono RPC client (`apiClient`) because the
  notifications endpoint was added after the RPC client was generated; raw
  `fetch` is used instead (same approach as `usePushNotifications`).
- The mutation writes the server response directly into the query cache via
  `setQueryData`, so the UI reacts immediately without waiting for a refetch.

## Change history

### 2026-06-15 — created
- **Motivation**: provide a typed, cached client-side interface to the new
  notification settings endpoint for the `NotificationSettings` UI component.
