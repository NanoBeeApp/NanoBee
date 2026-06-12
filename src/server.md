# server.ts

## Responsibility
Custom server entry for the Cloudflare worker (referenced by `wrangler.json`
`"main": "src/server.ts"`). Dispatches `/api/*` and `/health` to the Hono API
worker; everything else (SSR, server functions, assets) goes to the default
TanStack Start handler.

## Core exports / API
- `default` — `{ fetch(request, env, ctx) }` worker handler

## Dependencies
- Upstream: `@tanstack/react-start/server-entry` (default Start handler),
  `./worker/api-worker`, `@cloudflare/workers-types` (types only)
- Downstream: `wrangler.json` (`main`), @cloudflare/vite-plugin (dev runtime)

## Notes
- `wrangler.json` `main` MUST point at this file. Pointing it at
  `@tanstack/react-start/server-entry` loads the package's default entry and
  silently bypasses the Hono dispatch (API requests then fall through to the
  router 404 page).
- `handler.fetch` is published as `(request) => ...` but passes all worker
  arguments through at runtime; the cast keeps env/ctx flowing to server
  functions.

## Change history

### 2026-06-12 — created
- **Motivation**: the template shipped `ssr.tsx` / `server-entry.ts` from an
  older Start convention; with @tanstack/react-start 1.139+ neither file is
  loaded, so /api requests fell through to the router 404 page.
- **Goal**: route API traffic to Hono in both dev and production.
- **Key decision**: point wrangler `main` directly at this file — the
  @cloudflare/vite-plugin uses wrangler `main` as the worker entry, so the
  Start plugin's own `src/server.ts` resolution alone is not sufficient.
