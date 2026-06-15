# src/worker/routes/tasks.ts

## Responsibility
`/api/tasks` — create a task (from an AI suggestion card or the selection
float) and pause/resume it.

## Core exports / API
- `taskRoutes` — Hono sub-app:
  - `POST /` (full task payload) → `201 { task }` | `400` | `500` — idempotent on id
  - `POST /:id/toggle` → `200 { task }` (status + next flipped) | `404` | `500`

## Dependencies
- Upstream: `db/repo` (getTask, ANON_OWNER), `auth/cookies`, `auth/store`, zod, `../api-worker` (Env type)
- Downstream: mounted by `routes/api.ts`; called by the store's createTask/toggleTask

## Notes
- Creation uses `INSERT OR IGNORE` so a double-clicked confirm button (or a
  suggestion confirmed again after reload) cannot duplicate a task.
- Toggle rebuilds the payload JSON explicitly field-by-field; update the list
  when `Task` gains fields.

## Change history

### 2026-06-15 — Added `DELETE /api/tasks/:id`; persist optional task fields
- **Motivation**: The redesigned Tasks page deletes a task from the detail drawer and stores the new optional kind/batch/history display data.
- **Goal**: A real owner-scoped delete endpoint and a schema that accepts and round-trips the new optional fields.
- **Change**: Added the owner-scoped `DELETE /:id` route (404 when absent). Widened `taskSchema` to accept optional `kind` / `runState` / `batch` / `history`. The toggle handler now spreads the whole payload (preserving batch/history) instead of listing fields. (Owner scoping across POST/toggle/DELETE was completed in parallel with the multi-user isolation work.)

### 2026-06-12 — created
- **Motivation**: "create a task from chat" is the PRD's headline flow but
  tasks lived only in memory; pause/resume also has to survive reloads.

### 2026-06-15 — task scheduling engine integration
- Added `triggerSpecSchema` (Zod discriminated union on `kind: 'schedule' | 'condition'`) to `taskSchema` as optional `triggerSpec` field.
- `POST /`: extracts `triggerSpec` from validated data; persists it to `trigger_spec` column (separate from display `payload`); computes initial `next_run_at` via `computeNextRunAt()` for schedule tasks, or sets `next_run_at = now` for condition tasks so the first cron tick evaluates them immediately.
- `POST /:id/toggle`: on pause, clears `next_run_at = NULL` so cron skips the task; on resume of schedule tasks, recomputes `next_run_at` via `computeNextRunAt()`; on resume of condition tasks, sets `next_run_at = now`.
- Imports `computeNextRunAt` from `../scheduler/engine` and `TriggerSpec` from `../../types`.

### 2026-06-15 — multi-tenant owner isolation
- **Motivation**: migration 0012 adds an `owner` column to `tasks`. All three endpoints
  must scope their reads and writes to the caller's owner bucket to prevent cross-user
  task access or mutation.
- **Changes**:
  - Added `ownerOf(c)` helper (same pattern as `research.ts`): resolves `getSessionToken`
    → `getUserBySessionToken` → `user?.id ?? ANON_OWNER`.
  - `POST /`: `INSERT OR IGNORE INTO tasks` now includes `owner`; `getTask` receives owner.
  - `POST /:id/toggle`: `getTask` receives owner (returns null → 404 for foreign tasks);
    `UPDATE tasks SET status` gains `AND owner = ?` guard.
  - `DELETE /:id`: `getTask` receives owner; `DELETE FROM tasks` gains `AND owner = ?`.

### 2026-06-15 — remove ensureSeeded calls and db/seed dependency
- **Motivation**: remove all demo/seed data and hardcoded fixed data so the app starts empty; `db/seed.ts` and the `SEED_DEMO_DATA` env flag were deleted entirely.
- The `ensureSeeded(c.env)` call previously at the top of `POST /` is removed, along with the `db/seed` import.
- Tasks now only exist because a user created them through a chat; the DB starts empty.
