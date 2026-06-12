# api.ts

## Responsibility
Business API routes mounted under `/api`. Currently contains a smoke-test
`hello` endpoint and a D1-backed `users` CRUD example proving the full
stack (Hono + zod validation + D1) end to end.

## Core exports / API
- `apiRoutes` — Hono sub-app with:
  - `GET /hello?name=` → `{ message, timestamp }`
  - `GET /users` → `{ users: [...] }` (50 most recent, from D1)
  - `POST /users` `{ name, email }` → `201 { user }` | `409` duplicate email | `500`

## Dependencies
- Upstream: `hono`, `@hono/zod-validator`, `zod`, `../config`, `../api-worker` (Env type)
- Downstream: `api-worker.ts` (mounts), `src/lib/api-client.ts` (types)

## Notes
- Always use prepared statements with `.bind()` — never interpolate user input.
- The `users` endpoints are scaffolding examples; replace with real NanoBee
  endpoints (chat, tasks, proactive updates) as the product grows.

## Verification
1. `pnpm db:migrate:local && pnpm dev`
2. `curl localhost:5173/api/users` → `{"users":[]}`
3. `curl -X POST localhost:5173/api/users -H 'Content-Type: application/json' -d '{"name":"a","email":"a@b.c"}'` → 201
4. repeat step 3 → 409

## Change history

### 2026-06-12 — created
- **Motivation**: template init with D1; the template's mock users endpoints
  were not backed by storage so nothing proved the database path worked.
- **Goal**: an end-to-end verifiable D1 example (validation → insert → query).
- **Key decision**: kept the template's `users` resource shape but moved it to
  real D1 tables instead of in-memory mocks.
