# index.ts

## Responsibility
Auth router aggregator: combines the email/password, session and OAuth
sub-routers into `authRoutes`, mounted at `/api/auth` by `routes/api.ts`.

## Core exports / API
- `authRoutes` — Hono sub-app chaining `emailAuthRoutes`, `sessionRoutes`,
  `oauthRoutes`, `accountRoutes` (all on `/` so paths stay flat under `/api/auth`)

## Dependencies
- Upstream: `./email`, `./session`, `./oauth`, `./account`, `../../api-worker` (Env)
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

### 2026-06-15 — add accountRoutes
- **Motivation**: password reset, session management, data export and account
  deletion require new endpoints under the same `/api/auth` prefix.
- **Goal**: add `accountRoutes` from `./account.ts` to the chain.

### 2026-06-12 — OAuth callback path confirmed as /api/auth/<provider>/callback
- **Motivation**: a `redirect_uri_mismatch` from Google during end-to-end
  verification; an OAuth-app JSON export suggested
  `/api/social-auth/...` and the mount was briefly moved there, but the
  Google Cloud Console actually registers
  `…/api/auth/google/callback` (dev + localhost:3333), so the mount was
  restored.
- **Key decision**: the provider consoles are the source of truth for the
  callback path; a regression test now pins the generated `redirect_uri`.
