# src/worker/ai/settings.ts

## Responsibility
Per-user AI provider settings: D1 repository (read/upsert on the
`user_ai_settings` table) plus runtime resolution. `resolveAiConfig` answers
"which provider / base URL / model / API key should this request use" — the
user's saved settings when present, otherwise the backend default
(OpenRouter + Gemini 3.5 Flash with the built-in `OPENROUTER_API_KEY`).

## Core exports / API
- `getUserAiSettings(db, userId)` → `UserAiSettings | null` (key masked to
  `hasApiKey`, never the raw value)
- `saveUserAiSettings(env, userId, input)` — upsert; `apiKey` semantics:
  `undefined` = keep stored key, `""` = clear, string = encrypt + replace
- `resolveAiConfig(env, userId | null)` → `AiRuntimeConfig` (with decrypted
  key, for the chat pipeline only)

## Dependencies
- Upstream: `lib/ai-providers.ts`, `worker/ai/crypto.ts`, `worker/api-worker.ts` (Env)
- Downstream: `worker/routes/ai-settings.ts`, `worker/routes/messages.ts`

## Notes
- Empty `base_url` / `model` columns mean "use the provider's default", so
  catalog default updates apply to users who never overrode them.
- OpenRouter users without their own key fall back to the built-in key;
  other providers never fall back (their `resolveAiConfig` returns
  `apiKey: null` and the chat pipeline degrades to the rule-based reply).
- Storing a key without `AUTH_SECRET` configured throws instead of silently
  downgrading to plaintext.

## Change history

### 2026-06-12 — created
- **Motivation**: new users must be able to choose an AI provider and bring
  their own key/host/model, while the backend default stays OpenRouter +
  DeepSeek V4 Flash; the chat pipeline needs one place to resolve all that.
- **Key decision**: split "what the API returns" (`UserAiSettings`, masked)
  from "what the model call needs" (`AiRuntimeConfig`, decrypted) so route
  handlers can never accidentally leak a stored key.

### 2026-06-12 — add getStoredProviderKey
- **Motivation**: the model-list endpoint needs the user's decrypted key for a
  provider, possibly one the user is about to switch to.
- **Goal**: expose `{ provider, apiKey }` (key decrypted) without widening the
  masked `UserAiSettings` shape that routes return to clients.
- **Key decision**: only the model-list route consumes it, and it pairs the key
  with its provider so callers can reject a key meant for a different provider.

### 2026-06-13 — per-user web-search (Tavily) key
- **Motivation**: the web-search agent tool is keyed; users enter their own
  key in the AI settings dialog, with NanoBee's built-in default as fallback.
- **Goal**: `web_search_key_enc` column (migration 0005, AES-GCM like
  api_key_enc); `hasWebSearchKey` in `UserAiSettings`; `webSearchKey` in
  `SaveAiSettingsInput` (keep/clear/replace); new `resolveWebSearchKey(env,
  userId)` → user's key else `TAVILY_API_KEY`.
- **Key decision**: key-column upsert plumbing extracted into `keyUpsert` so
  both encrypted keys share one code path; the web-search key is
  provider-independent and survives provider switches.

### 2026-06-13 — web search provider column
- **Motivation**: persist which web-search provider a stored key belongs to.
- **Change**: `UserAiSettings`/`SaveAiSettingsInput` gained `webSearchProvider`;
  reads/writes the new `web_search_provider` column (migration 0009).
  `resolveWebSearchKey` now returns `{ provider, key }` (built-in fallback is
  Tavily) so callers inject under the right `<provider>_api_key` name.
