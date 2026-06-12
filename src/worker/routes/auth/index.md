# index.ts

## Responsibility
Auth router aggregator: combines the email/password, session and OAuth
sub-routers into `authRoutes`, mounted at `/api/auth` by `routes/api.ts`.

## Core exports / API
- `authRoutes` — Hono sub-app chaining `emailAuthRoutes`, `sessionRoutes`,
  `oauthRoutes` (all on `/` so paths stay flat under `/api/auth`)

## Dependencies
- Upstream: `./email`, `./session`, `./oauth`, `../../api-worker` (Env)
- Downstream: `routes/api.ts`, typed RPC client (`src/lib/api-client.ts`)

## Notes
- Sub-routers are chained with `.route()` so `AppType` keeps full endpoint
  type inference for the frontend RPC client.

## Change history

### 2026-06-12 — created
- **Motivation**: the auth feature spans three concern areas (passwords,
  sessions, OAuth); one flat file would mix unrelated logic.
- **Goal**: per-concern modules with a single mount point, mirroring the
  existing routes/ layout.
- **Key decision**: flat URL space (`/register`, `/me`, `/:provider/start`)
  instead of nested prefixes — shorter client calls, no ambiguity.
