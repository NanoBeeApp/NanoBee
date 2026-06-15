# src/worker/routes/bootstrap.ts

## Responsibility
`GET /api/bootstrap` — returns the app's full initial state (sidebar chats,
conversations, tasks, Today updates) in one round-trip. The database always
starts empty; returned state reflects only real user activity.

## Core exports / API
- `bootstrapRoutes` — Hono sub-app: `GET /` → `{ chats, conversations, tasks, updates }` | `500`

## Dependencies
- Upstream: `db/repo`, `../api-worker` (Env type)
- Downstream: mounted by `routes/api.ts`; consumed by the store's `bootstrap()`

## Notes
- The four list queries run in `Promise.all` — independent reads, one trip each.

## Change history

### 2026-06-12 — created
- **Motivation**: the client needs the persisted state on startup; one
  endpoint instead of four keeps first paint to a single fetch and gives the
  seeding hook a natural home.

### 2026-06-12 — demo seeding restricted to local dev
- **Motivation**: real accounts on deployed environments saw the prototype's
  demo chats/tasks/updates; clearing the database didn't help because the
  next request re-seeded it.
- **Goal**: deployed environments boot into a clean new-user state.
- **Key decision**: the env gate lived inside `ensureSeeded` (gated on
  `SEED_DEMO_DATA="1"`), so this route called it unconditionally.

### 2026-06-15 — remove ensureSeeded call and db/seed dependency
- **Motivation**: remove all demo/seed data and hardcoded fixed data so the app starts empty; `db/seed.ts` and the `SEED_DEMO_DATA` env flag were deleted entirely.
- The `ensureSeeded(c.env)` call and the `db/seed` import are removed; the route now runs the four `Promise.all` D1 reads unconditionally with no seeding step.
- The DB always starts empty; any content is the result of real user activity.
