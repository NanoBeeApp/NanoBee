# api-worker.ts

## Responsibility
Entry point of the Hono API worker. All backend endpoints and business logic
are mounted here. Also defines the `Env` bindings type (D1 database `DB`) and
exports `AppType` for the typed RPC client.

## Core exports / API
- `default` — the Hono app (consumed by `server-entry.ts` / `ssr.tsx`)
- `Env` — Cloudflare bindings type: `DB: D1Database` plus auth secrets
  (`AUTH_SECRET`, `RESEND_API_KEY`, `GOOGLE_/GITHUB_CLIENT_ID/SECRET`) and
  auth vars (`EMAIL_FROM`, `LOG_EMAIL_CODES`)
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
