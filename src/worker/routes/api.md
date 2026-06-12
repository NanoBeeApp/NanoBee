# api.ts

## Responsibility
Business API routes mounted under `/api`. Aggregates the NanoBee app
endpoints (bootstrap / messages / tasks / updates, one module per resource)
plus the original smoke-test `hello` and D1 `users` example.

## Core exports / API
- `apiRoutes` — Hono sub-app with:
  - `route /bootstrap` → see `bootstrap.ts`
  - `route /messages` → see `messages.ts`
  - `route /tasks` → see `tasks.ts`
  - `route /updates` → see `updates.ts`
  - `GET /hello?name=` → `{ message, timestamp }`
  - `GET /users` → `{ users: [...] }` (50 most recent, from D1)
  - `POST /users` `{ name, email }` → `201 { user }` | `409` duplicate email | `500`

## Dependencies
- Upstream: `hono`, `@hono/zod-validator`, `zod`, `../config`, `../api-worker`
  (Env type), `./bootstrap`, `./messages`, `./tasks`, `./updates`
- Downstream: `api-worker.ts` (mounts), `src/lib/api-client.ts` (types)

## Notes
- Always use prepared statements with `.bind()` — never interpolate user input.
- Sub-apps are chained with `.route()` so the typed RPC client infers every
  endpoint from `AppType`.

## Verification
1. `pnpm db:migrate:local && pnpm dev`
2. `curl localhost:5173/api/bootstrap` → seeded `{ chats, conversations, tasks, updates }`
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
