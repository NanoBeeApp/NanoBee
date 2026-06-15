# src/worker/ai/provider-keys.ts

## Responsibility
Per-user, per-provider encrypted API-key vault for the compare page, plus
`resolveCompareConfig` — the compare-time equivalent of `resolveAiConfig`.

## Core exports
- `ProviderKeyStatus { provider, baseUrl, hasApiKey }`.
- `listUserProviderKeys(db, userId)` → masked list of configured providers.
- `saveUserProviderKey(env, userId, { provider, baseUrl, apiKey? })` — upsert
  (apiKey: undefined=keep, ""=clear, string=encrypt+replace).
- `deleteUserProviderKey(db, userId, provider)`.
- `resolveCompareConfig(env, userId, provider, model)` → `AiRuntimeConfig | null`
  (null = no usable key; OpenRouter falls back to the built-in key).

## Relationships
- Upstream: `../../lib/ai-providers` (provider catalog), `./crypto`
  (AES-256-GCM), `./settings` (`AiRuntimeConfig` type), `../api-worker` (`Env`).
- Downstream: `../routes/compare.ts` (key CRUD + stream endpoint).
- Storage: `user_provider_keys` (migration 0011).

## Notes
- Mirrors `settings.ts` key semantics so the two vaults behave identically.
- Returns null rather than throwing on "no key" so a single column can degrade
  to a "configure key" state without failing the whole compare run.

## Change history
### 2026-06-15 — Created
- Reason: compare MVP supports cross-provider runs, needing per-provider keys.
- Goal: a small CRUD + resolver isolated from the main-chat settings.
- Key decision: OpenRouter built-in-key fallback kept here too, so OpenRouter
  columns work with no user setup.
