# src/worker/routes/tasks.ts

## Responsibility
`/api/tasks` — create a task (from an AI suggestion card or the selection
float) and pause/resume it.

## Core exports / API
- `taskRoutes` — Hono sub-app:
  - `POST /` (full task payload) → `201 { task }` | `400` | `500` — idempotent on id
  - `POST /:id/toggle` → `200 { task }` (status + next flipped) | `404` | `500`

## Dependencies
- Upstream: `db/repo` (getTask), zod, `../api-worker` (Env type)
- Downstream: mounted by `routes/api.ts`; called by the store's createTask/toggleTask

## Notes
- Creation uses `INSERT OR IGNORE` so a double-clicked confirm button (or a
  suggestion confirmed again after reload) cannot duplicate a task.
- Toggle rebuilds the payload JSON explicitly field-by-field; update the list
  when `Task` gains fields.

## Change history

### 2026-06-12 — created
- **Motivation**: "create a task from chat" is the PRD's headline flow but
  tasks lived only in memory; pause/resume also has to survive reloads.

### 2026-06-15 — remove ensureSeeded calls and db/seed dependency
- **Motivation**: remove all demo/seed data and hardcoded fixed data so the app starts empty; `db/seed.ts` and the `SEED_DEMO_DATA` env flag were deleted entirely.
- The `ensureSeeded(c.env)` call previously at the top of `POST /` is removed, along with the `db/seed` import.
- Tasks now only exist because a user created them through a chat; the DB starts empty.
