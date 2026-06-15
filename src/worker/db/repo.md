# src/worker/db/repo.ts

## Responsibility
D1 row ↔ domain-type mapping for the NanoBee tables. Centralizes the SQL and
the JSON-payload (de)serialization so route handlers stay thin.

## Core exports / API
- `ANON_OWNER` — re-exported constant `"anon"` (canonical source: `artifacts/repo.ts`)
- `listChats(db, owner)` → `ChatMeta[]` (pinned first, then newest first; seeds keep authored order)
- `listConversations(db, owner)` → `Record<chatId, ChatMessage[]>` (insertion order)
- `listTasks(db, owner)` → `Task[]` (newest user-created first; seeds keep authored order)
- `getTask(db, id, owner)` → `Task | null`
- `listUpdates(db, owner)` → `UpdateItem[]`

## Dependencies
- Upstream: `src/types`, `@cloudflare/workers-types`, `../artifacts/repo` (ANON_OWNER)
- Downstream: `routes/bootstrap.ts`, `routes/tasks.ts`

## Notes
- Hot/query fields (ids, topic, status, group) are real columns; rich
  display content lives in a `payload` JSON column — see migration 0002.
- `listConversations` loads all messages for the owner in one query; fine at demo scale,
  paginate per chat when conversations grow.
- `ANON_OWNER` is defined in `artifacts/repo.ts` and re-exported here for convenience.
  That file is the canonical source; do not re-define the constant.

## Change history

### 2026-06-15 — Surface triggerSpec in listTasks / getTask for the detail drawer
- **Motivation**: The `TaskDetailDrawer` needs to show a structured trigger summary (schedule hour/minute, condition sourceId/op/threshold) from `triggerSpec`. The column existed in D1 (added in migration 0013) but was not included in `TaskRow` or the SELECT queries.
- **Changes**:
  - Added `trigger_spec: string | null` to `TaskRow` interface.
  - Updated `listTasks` and `getTask` SQL to `SELECT ... trigger_spec FROM tasks ...`.
  - Updated `rowToTask` to parse `trigger_spec` JSON and attach it as `triggerSpec` on the returned `Task` when non-null.
  - Added `TriggerSpec` to the import from `../../types`.

### 2026-06-15 — scheduler write path
- Added `SchedulerTaskRow` interface (exported) — the extended row type that includes `owner`, `trigger_spec`, `last_run_at`, `next_run_at`, `scheduler_state` for the cron handler.
- Added `createUpdate(db, owner, update)` — writes one proactive feed row for an owner; called by the cron engine after a trigger fires.
- Added `listActiveDueTasks(db, cutoff)` — cross-owner SELECT of all active tasks with `trigger_spec IS NOT NULL AND (next_run_at IS NULL OR next_run_at <= cutoff)`; used only by the `scheduled()` cron handler. Intentionally cross-owner: the cron handler must iterate all users.
- Added `updateTaskSchedulerState(db, id, lastRunAt, nextRunAt, schedulerState)` — updates `last_run_at`, `next_run_at`, and `scheduler_state` after a task fires. Scoped by `id` only (not `owner`) because it is called exclusively from the server-side cron handler using ids sourced from D1 — never from user input.

### 2026-06-15 — multi-tenant owner isolation
- All five exported functions gain an `owner: string` parameter.
- Every SELECT gains `WHERE owner = ?` so each user only sees their own rows.
- `getTask` gains `AND owner = ?` on the WHERE clause to prevent cross-user task access.
- Re-exports `ANON_OWNER` from `artifacts/repo` so callers can import from one place.
- Migration 0012 adds the `owner` column (with index) to all four tables.

### 2026-06-14 — newly created chats must appear at the top of the list
- **Motivation**: user reported that a newly created chat ("话题", Topic) showed up at
  the *bottom* of its time-group instead of the top after reload — a basic
  ordering expectation any chat UI must meet.
- **Root cause**: `listChats` ordered by `rowid ASC`, so freshly inserted chats
  (highest rowid) sorted last within each group. `listTasks` already did
  newest-first; chats were the inconsistent one.
- **Change**: `listChats` now orders `pinned DESC, created_at DESC, rowid ASC`
  (pinned on top, then newest first, with rowid as a stable tie-breaker that
  preserves the seed rows' authored order since they share a timestamp).

### 2026-06-13 — remove the read/unread feature
- **Motivation**: user asked to drop read-state management entirely.
- **Change**: `listUpdates` no longer selects or maps the `unread` column
  (dropped by migration 0006).

### 2026-06-12 — created
- **Motivation**: the first D1 endpoints inlined SQL in the route file; with
  four tables and JSON payloads the mapping needed one shared, typed home so
  every route deserializes rows identically.
