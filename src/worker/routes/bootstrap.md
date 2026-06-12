# src/worker/routes/bootstrap.ts

## Responsibility
`GET /api/bootstrap` — returns the app's full initial state (sidebar chats,
conversations, tasks, Today updates) in one round-trip. On an empty local-dev
database it seeds the demo data first (`ensureSeeded` is a no-op unless
`SEED_DEMO_DATA="1"`); deployed environments return the real, possibly empty,
state.

## Core exports / API
- `bootstrapRoutes` — Hono sub-app: `GET /` → `{ chats, conversations, tasks, updates }` | `500`

## Dependencies
- Upstream: `db/seed`, `db/repo`, `../api-worker` (Env type)
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
- **Key decision**: the env gate lives inside `ensureSeeded` (now takes
  `c.env`), so this route just calls it unconditionally.
