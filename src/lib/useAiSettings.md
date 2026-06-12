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

### 2026-06-12 — add useFetchModels
- **Motivation**: the setup dialog should offer a model dropdown fetched from
  the provider instead of asking users to type model ids by hand.
- **Goal**: a `useFetchModels` mutation hitting POST /api/ai/models, returning
  the model-id list and surfacing the server error message on failure.
- **Key decision**: a mutation (not a query) since it is triggered explicitly /
  on provider change and depends on the in-form key/host, not a stable key.

### 2026-06-12 — add useTestConnection
- **出发点**：双栏弹窗的「连接测试」需要前端 mutation。
- **目标**：`useTestConnection` 调 POST /api/ai/test，返回 `{ok,latencyMs,modelCount?,error?}`。
- **关键决策**：失败的连接以 `{ok:false}` 返回而非 throw，组件按结果渲染三态。
