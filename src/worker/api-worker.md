# api-worker.ts

## Responsibility
Entry point of the Hono API worker. All backend endpoints and business logic
are mounted here. Also defines the `Env` bindings type (D1 database `DB`) and
exports `AppType` for the typed RPC client.

## Core exports / API
- `default` — the Hono app (consumed by `server-entry.ts` / `ssr.tsx`)
- `Env` — Cloudflare bindings type: `DB: D1Database` plus auth secrets
  (`AUTH_SECRET`, `RESEND_API_KEY`, `GOOGLE_/GITHUB_CLIENT_ID/SECRET`),
  auth vars (`EMAIL_FROM`, `LOG_EMAIL_CODES`), AI keys (`OPENROUTER_API_KEY`,
  `TAVILY_API_KEY`) and data-hub config (`DATA_HUB_URL`, `MCP_SERVERS`)
- `AppType` — type of the mounted API routes, used by `src/lib/api-client.ts`
- Routes: `/api/*` (see `routes/api.ts`), `GET /health`

## Dependencies
- Upstream: `hono`, `./config`, `./routes/api`
- Downstream: `src/server-entry.ts`, `src/ssr.tsx`, `src/lib/api-client.ts`

## Notes
- New endpoint groups should be separate files under `routes/` and mounted here.
- `Env` must stay in sync with `wrangler.json` bindings; run `pnpm cf-typegen`
  after changing bindings.

## Change history

### 2026-06-12 — created
- **Motivation**: initialize the full stack from the init-hono-tanstack-rpc
  template with D1 as the default database.
- **Goal**: single Hono entry point for all backend logic, typed end to end.
- **Key decision**: added the `DB: D1Database` binding to `Env` from day one
  so every route gets typed D1 access.

### 2026-06-12 — auth env surface added
- **Motivation**: the auth system needs secrets (state signing, Resend,
  OAuth credentials) and non-secret vars; handlers must access them through
  a typed `Env`.
- **Key decision**: all auth env fields are optional strings — locally they
  come from `.dev.vars`, in deployments from `wrangler secret` /
  `wrangler.json` vars, and routes degrade gracefully when missing
  (e.g. 501 `provider_not_configured`).

### 2026-06-12 — SEED_DEMO_DATA var added (superseded — see 2026-06-15)
- **Motivation**: demo seeding had to become opt-in so deployed databases can
  stay empty for real accounts; the switch needs a typed home in `Env`.
- **Key decision**: optional string set only in `.dev.vars` — absent in
  `wrangler.json` vars so no deployed environment can accidentally seed.

### 2026-06-15 — Added VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY_ENC to Env type
- `VAPID_PUBLIC_KEY?: string` — base64url P-256 public key for VAPID JWT signing; non-secret var in `wrangler.json` (empty string = Web Push inactive).
- `VAPID_PRIVATE_KEY_ENC?: string` — P-256 private key AES-256-GCM encrypted with `AUTH_SECRET` (same scheme as `api_key_enc`); set via `wrangler secret put`.
- Both fields are optional; when absent the scheduler silently skips push delivery and falls back to the in-app feed only.

### 2026-06-15 — remove SEED_DEMO_DATA from Env; demo seeding mechanism deleted
- **Motivation**: remove all demo/seed data and hardcoded fixed data so the app starts empty; `db/seed.ts` was deleted entirely.
- `SEED_DEMO_DATA?: string` is removed from the `Env` type — no deployed or local environment can reference it.
- The seeding mechanism (`ensureSeeded`) no longer exists; the DB always starts empty and grows through real use.

### 2026-06-12 — OPENROUTER_API_KEY
- **Motivation**: the backend default AI provider (DeepSeek V4 Flash via
  OpenRouter) needs a built-in key for users who haven't supplied their own.
- **Key decision**: optional secret in `Env` (`.dev.vars` locally,
  `wrangler secret put` in deployed envs); when absent the chat pipeline
  degrades to the rule-based reply instead of failing.
