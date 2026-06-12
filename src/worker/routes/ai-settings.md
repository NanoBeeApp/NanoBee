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
