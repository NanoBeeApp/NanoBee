# src/worker/routes/bootstrap.ts

## Responsibility
`GET /api/bootstrap` — returns the app's full initial state (sidebar chats,
conversations, tasks, Today updates) in one round-trip, seeding the demo data
first when the database is empty.

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
