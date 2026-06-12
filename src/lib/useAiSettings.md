# src/lib/useAiSettings.ts

## Responsibility
TanStack Query hooks around `/api/ai/settings`: `useAiSettings` (saved
settings + `configured` flag of the signed-in user) and `useSaveAiSettings`
(PUT mutation). Powers the first-login setup dialog and the account-menu
settings entry.

## Core exports / API
- `useAiSettings(enabled)` — query, `null` on 401/error; `enabled` gates the
  request until the auth state is known
- `useSaveAiSettings()` — mutation; on success writes the response straight
  into the query cache (no refetch round-trip)
- `AI_SETTINGS_QUERY_KEY`, types `AiSettings`, `AiSettingsResponse`,
  `SaveAiSettingsInput`

## Dependencies
- Upstream: `lib/api-client.ts` (typed RPC), `lib/ai-providers.ts` (types)
- Downstream: `components/onboarding/AiProviderSetupDialog.tsx`

## Notes
- Mutation errors surface the server's zh-CN `error` message so the dialog
  can show it verbatim.

## Change history

### 2026-06-12 — created
- **Motivation**: the setup dialog needs reactive access to "has this user
  configured a provider yet" to decide whether to auto-open on first login.
- **Key decision**: update the cache from the PUT response via `setQueryData`
  instead of invalidating — the dialog closes instantly rather than waiting
  for a refetch (a review finding).
