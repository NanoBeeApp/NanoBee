# api-worker.ts

## Responsibility
Entry point of the Hono API worker. All backend endpoints and business logic
are mounted here. Also defines the `Env` bindings type (D1 database `DB`) and
exports `AppType` for the typed RPC client.

## Core exports / API
- `default` — the Hono app (consumed by `server-entry.ts` / `ssr.tsx`)
- `Env` — Cloudflare bindings type (`DB: D1Database`)
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
