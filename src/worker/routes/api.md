# api.ts

## Responsibility
Business API routes mounted under `/api`. Aggregates the NanoBee app
endpoints (auth / bootstrap / messages / tasks / updates, one module per
resource) plus the smoke-test `hello` endpoint.

## Core exports / API
- `apiRoutes` — Hono sub-app with:
  - `route /auth` → see `auth/index.ts` (register / login / OAuth / session)
  - `route /bootstrap` → see `bootstrap.ts`
  - `route /messages` → see `messages.ts`
  - `route /tasks` → see `tasks.ts`
  - `route /updates` → see `updates.ts`
  - `GET /hello?name=` → `{ message, timestamp }`

## Dependencies
- Upstream: `hono`, `../api-worker` (Env type), `./auth`, `./bootstrap`,
  `./messages`, `./tasks`, `./updates`
- Downstream: `api-worker.ts` (mounts), `src/lib/api-client.ts` (types)

## Notes
- Always use prepared statements with `.bind()` — never interpolate user input.
- Sub-apps are chained with `.route()` so the typed RPC client infers every
  endpoint from `AppType`.

## Verification
1. `pnpm db:migrate:local && pnpm dev`
2. `curl localhost:3333/api/bootstrap` → seeded `{ chats, conversations, tasks, updates }`
3. `pnpm test:run` → all integration tests pass

## Change history

### 2026-06-12 — created
- **Motivation**: template init with D1; the template's mock users endpoints
  were not backed by storage so nothing proved the database path worked.
- **Goal**: an end-to-end verifiable D1 example (validation → insert → query).
- **Key decision**: kept the template's `users` resource shape but moved it to
  real D1 tables instead of in-memory mocks.

### 2026-06-12 — NanoBee endpoints mounted
- **Motivation**: the MVP needed real chat/task/read-state persistence; one
  flat route file would have grown unreadable, so each resource got its own
  module and this file became the aggregator.

### 2026-06-12 — auth mounted, smoke-test users endpoints removed
- **Motivation**: the real auth system landed (`routes/auth/`); the 0001
  smoke-test `users` table was replaced by the auth-grade schema, and open
  list/create user endpoints would have been an information leak.
- **Goal**: `/api/auth/*` as the only way user rows are created or read.

### 2026-06-12 — OAuth mount confirmed under /auth
- **Motivation**: during end-to-end verification, OAuth was briefly
  remounted at `/social-auth` based on an OAuth-app JSON export, but the
  Google Cloud Console actually registers
  `…/api/auth/google/callback`, so the original `/auth` mount was restored.
- **Key decision**: the registered redirect URIs in the provider consoles
  are the contract; `tests/api.spec.ts` now pins the generated
  `redirect_uri` path.
