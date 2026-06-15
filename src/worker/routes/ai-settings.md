# src/worker/routes/ai-settings.ts

## Responsibility
HTTP surface for per-user AI provider settings, mounted at `/api/ai`:
- `GET /api/ai/settings` — saved settings (key masked to `hasApiKey`) plus
  backend defaults; `configured: false` drives the first-login setup dialog.
- `PUT /api/ai/settings` — zod-validated upsert with per-provider rules.
Both require a signed-in session (401 otherwise).

## Core exports / API
- `aiSettingsRoutes` (Hono sub-app, chained for typed RPC inference)

## Dependencies
- Upstream: `lib/ai-providers.ts`, `worker/ai/settings.ts`,
  `worker/auth/cookies.ts` + `worker/auth/store.ts` (session → user),
  `worker/config.ts`
- Downstream: `worker/routes/api.ts` (mount), `lib/useAiSettings.ts` (client)

## Notes
- Validation rules: `custom` requires a base URL; providers without a
  built-in fallback key (DeepSeek / OpenAI / Anthropic / custom) require a
  key now or one already on file for the *same* provider.
- Switching providers without sending a new key invalidates the stored key
  instead of silently reusing it against a different API.
- Raw keys travel request-inbound only; responses never echo them.

## Change history

### 2026-06-12 — created
- **Motivation**: new users must choose an AI provider and enter key/host/
  model after first login; the frontend needs a safe API that exposes
  configuration state without exposing secrets.
- **Key decision**: `apiKey` tri-state semantics (`undefined` keep / `""`
  clear / string replace) so the edit dialog can save unrelated changes
  without forcing users to re-enter their key.

### 2026-06-12 — review fix
- **Motivation**: code review found that a direct API call switching
  providers while omitting `apiKey` would carry the old provider's key over.
- **Goal**: a stored key is only ever sent to the provider it was entered for.

### 2026-06-12 — add POST /api/ai/models
- **Motivation**: auto-fetch the provider's model list so users pick from a
  dropdown rather than copy-pasting model ids from each vendor's docs.
- **Goal**: authenticated endpoint that resolves the effective key (request key
  → stored key for the same provider → built-in OpenRouter key) and returns the
  model ids via `listProviderModels`, never echoing the key.
- **Key decision**: gate on the catalog's `canListModels`; key resolution mirrors
  resolveAiConfig so behavior stays consistent with the chat pipeline.

### 2026-06-12 — add POST /api/ai/test + extract resolveProbeKey
- **Motivation**: the settings dialog needs a "Test connection" action to validate provider configuration; the key-resolution logic in `/models` and `/test` was duplicated.
- **Goal**: extract `resolveProbeKey` (request key → stored key for the same provider → built-in OpenRouter key) for reuse by both paths; for providers where `canListModels` is true, `/test` delegates to `/models` (returns latency + model count); for others it calls `pingChatModel`.
- **Key decisions**: a failed connection returns `200 { ok: false, error }` (request succeeded, connection failed — semantically unambiguous); error messages expose only the status code, never the key.

### 2026-06-13 — web search provider in PUT
- **Change**: `putSchema` accepts `webSearchProvider` (Tavily / Brave / Serper /
  Exa). Switching web-search providers without a new key clears the stored key
  (it belonged to the old provider), mirroring the AI-provider key logic.
