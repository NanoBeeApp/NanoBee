# migrations/0014_push_subscriptions.sql

## Purpose

Creates the `push_subscriptions` table that stores Web Push endpoint
subscriptions for each user/device pair. This is the storage backing for the
Phase 1b VAPID / Web Push notification path.

### Table: `push_subscriptions`

| Column | Type | Notes |
|---|---|---|
| `id` | `TEXT PK` | `'sub_' + nanoid(12)` — generated inside handler scope, never at module level |
| `user_id` | `TEXT FK → users(id)` | `ON DELETE CASCADE` — row disappears when the user is deleted |
| `endpoint` | `TEXT` | Browser push service URL; not a secret; unique per user |
| `p256dh` | `TEXT` | Browser's P-256 DH public key (base64url); needed to encrypt the push payload |
| `auth_enc` | `TEXT` | Push auth secret, AES-256-GCM encrypted using `AUTH_SECRET`-derived key (same scheme as `user_provider_keys.api_key_enc`); KEY_CONTEXT = `'nanobee:push-auth:v1:'` |
| `user_agent` | `TEXT` | Optional device label stored for display purposes |
| `created_at` | `INTEGER` | Unix epoch seconds via `unixepoch()` |
| `updated_at` | `INTEGER` | Updated on upsert conflict resolution |

### Index

`idx_push_subscriptions_user` — lookup all subscriptions for a user during
the cron handler's push delivery loop.

## Change history & rationale

### 2026-06-15 — Initial creation

Phase 1b delivery channel. The in-app feed (`updates` table) is the
guaranteed Phase 1a channel. Web Push is additive: the cron handler calls
`sendWebPush` only when `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY_ENC` are
both set in the worker env and a subscription row exists for the owner.

The `auth_enc` encryption uses a distinct `KEY_CONTEXT` prefix
(`'nanobee:push-auth:v1:'`) from the AI key context
(`'nanobee:ai-api-key:v1:'`), preventing key reuse across purposes even
though both are derived from the same `AUTH_SECRET`.
