# migrations/0011_user_provider_keys.sql

## Responsibility
Create the `user_provider_keys` table: a per-user, per-provider encrypted API-key
vault that powers the multi-model compare page (one prompt, many providers).

## Core schema
- `user_provider_keys(user_id, provider, base_url, api_key_enc, created_at, updated_at)`,
  `PRIMARY KEY (user_id, provider)` — one row per (user, provider).
- `api_key_enc`: AES-256-GCM ciphertext (`v1$iv$ct`), or NULL when relying on the
  built-in OpenRouter key.

## Relationships
- Upstream: `users(id)` (FK, `ON DELETE CASCADE`).
- Downstream: `src/worker/ai/provider-keys.ts` (CRUD + `resolveCompareConfig`),
  `src/worker/routes/compare.ts` (endpoints).
- Independent of `user_ai_settings` (0004), which still drives the main chat.

## Notes
- Why a new table rather than widening `user_ai_settings`: that table is "the one
  provider the main chat uses" (single row, `PRIMARY KEY user_id`). Compare needs
  many providers per user simultaneously. Keeping them separate avoids overloading
  the chat's single-provider semantics (see Option A in the PRD).

## Change history
### 2026-06-15 — Created
- Reason: compare page MVP ships with cross-provider support, which requires
  storing one key per provider per user.
- Goal: an encrypted multi-key vault, isolated from the main chat's settings.
- Key decision: composite PK `(user_id, provider)`; OpenRouter key optional.
