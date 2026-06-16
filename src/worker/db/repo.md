# src/worker/db/repo.ts

## Responsibility
D1 row ↔ domain-type mapping for the NanoBee tables. Centralizes the SQL and
the JSON-payload (de)serialization so route handlers stay thin.

## Core exports / API
- `ANON_OWNER` — re-exported constant `"anon"` (canonical source: `artifacts/repo.ts`)
- `BOOTSTRAP_MSG_LIMIT` — constant (30): the number of messages per chat returned at bootstrap
- `listChats(db, owner)` → `ChatMeta[]` (pinned first, then newest first; seeds keep authored order)
- `listConversations(db, owner)` → `Record<chatId, ChatMessage[]>` (insertion order; full history — for internal use only)
- `encodeCursor(createdAt, id)` → `string` — produces an opaque `"<created_at>_<id>"` pagination cursor
- `decodeCursor(cursor)` → `{ createdAt, id } | null` — parses the opaque cursor; returns null on malformed input
- `listConversationsTrimmed(db, owner, limit)` → `{ conversations, pagination }` — bootstrap-time trimmed variant; returns the most recent `limit` messages per chat plus `ConvoPagination` metadata (hasMore + oldestCursor)
- `listMessagesPage(db, chatId, owner, beforeCursor, limit)` → `{ messages, hasMore, oldestCursor }` — cursor-based older-message page for one chat; used by `GET /api/chats/:id/messages`
- `listTasks(db, owner)` → `Task[]` (newest user-created first; seeds keep authored order)
- `getTask(db, id, owner)` → `Task | null`
- `listUpdates(db, owner)` → `UpdateItem[]`

## Dependencies
- Upstream: `src/types`, `@cloudflare/workers-types`, `../artifacts/repo` (ANON_OWNER)
- Downstream: `routes/bootstrap.ts`, `routes/tasks.ts`

## Notes
- Hot/query fields (ids, topic, status, group) are real columns; rich
  display content lives in a `payload` JSON column — see migration 0002.
- `listConversations` loads all messages for the owner in one query; kept for any
  internal use that needs the full history. Bootstrap now uses `listConversationsTrimmed`.
- `listConversationsTrimmed` uses an N+1 strategy: one `SELECT DISTINCT chat_id` query
  followed by a `db.batch()` of per-chat `LIMIT limit+1` descending queries. Memory is
  bounded to O(chats × limit × payload) — never loads all messages at once. The composite
  index `idx_messages_owner_chat_pagination (owner, chat_id, created_at DESC, id DESC)`
  added in migration 0020 makes each per-chat query a single index seek.
- `listMessagesPage` uses a compound `(created_at, id)` cursor encoded as `"<epoch>_<id>"`.
  The cursor is produced by `encodeCursor` and parsed by `decodeCursor`. SQLite's `rowid`
  virtual column cannot be used in `CREATE INDEX`, so `created_at` (second-level) with `id`
  as a tie-breaker provides equivalent ordering. Covered by the same composite index in 0020.
- `ANON_OWNER` is defined in `artifacts/repo.ts` and re-exported here for convenience.
  That file is the canonical source; do not re-define the constant.

## Change history

### 2026-06-15 — switch pagination cursor from rowid to (created_at, id) compound cursor
- **Root cause**: migration 0020 used `CREATE INDEX ... (owner, chat_id, rowid DESC)`.
  SQLite does not allow `rowid` (a virtual alias column) in explicit index definitions —
  this caused `SQLITE_ERROR: no such column: rowid at offset 88` when applying the migration.
- **Fix**: replaced `rowid`-based pagination with a compound `(created_at, id)` cursor
  encoded as an opaque `"<epoch>_<id>"` string. The migration index now uses
  `(owner, chat_id, created_at DESC, id DESC)` — all real columns, always valid.
- **Changes**:
  - Added `encodeCursor(createdAt, id)` and `decodeCursor(cursor)` helpers.
  - `ConvoPagination.oldestRowid` → `oldestCursor: string | null`.
  - `MessageRowWithRowid` → `MessageRowWithCursor` (uses `id` + `created_at` instead of `rowid`).
  - `listConversationsTrimmed` queries now select `id, created_at, payload` and order by
    `created_at DESC, id DESC`; cursor is built with `encodeCursor`.
  - `listMessagesPage` signature: `beforeRowid: number` → `beforeCursor: string`; the WHERE
    predicate uses compound `(created_at < ? OR (created_at = ? AND id < ?))` to handle ties.
  - Route `chat-messages.ts`: validator changed from `regex /^\d+$/` to `decodeCursor` check.
  - Store `useAppStore.ts`: `oldestRowid: number | null` → `oldestCursor: string | null`
    throughout; URL param is now `encodeURIComponent(pag.oldestCursor)`.
  - Tests `api.spec.ts`: updated `BootstrapBody.pagination` type, test cursors, and
    response field assertions to match the new cursor shape.

### 2026-06-15 — fix listConversationsTrimmed: bounded N+1 queries instead of unbounded bulk fetch
- **Motivation**: the previous implementation fetched ALL messages for an owner in a single
  unbounded query (`SELECT rowid, chat_id, payload FROM messages WHERE owner=? ORDER BY
  chat_id ASC, rowid DESC`), then sliced per chat in JS. A user with 100 chats × 200
  messages × ~2 KB = ~40 MB would hit the 128 MB Cloudflare Worker memory limit, creating
  a DoS / OOM risk.
- **Changes**:
  - Replaced the bulk fetch with a two-step strategy: (1) `SELECT DISTINCT chat_id` to get
    the list of chats for the owner; (2) `db.batch()` of per-chat `LIMIT limit+1`
    descending queries — one round-trip to D1 regardless of chat count.
  - Memory is now bounded to O(chats × limit × payload) regardless of total history length.
  - Added the composite index `idx_messages_owner_chat_rowid` (migration 0020) so each
    per-chat query is a single index seek rather than a full-scan-then-sort.
  - `MessageRowWithRowid` interface is retained; `MessageRow.chat_id` is no longer selected
    in the per-chat queries (chat_id is already known from the DISTINCT result).

### 2026-06-15 — message pagination: listConversationsTrimmed + listMessagesPage
- **Motivation**: bootstrap was returning every message of every chat; long
  conversations would bloat the initial payload and delay first paint.
- **Changes**:
  - Added `BOOTSTRAP_MSG_LIMIT = 30` constant.
  - Added `ConvoPagination` interface (`hasMore`, `oldestRowid`).
  - Added `listConversationsTrimmed(db, owner, limit)` — fetches all rows
    grouped per chat client-side, slices to the newest `limit`, reverses to
    oldest→newest, and returns `{ conversations, pagination }`.
  - Added `listMessagesPage(db, chatId, owner, beforeRowid, limit)` — rowid
    cursor query for one chat, fetches `limit + 1` newest-first to detect
    `hasMore`, then reverses to oldest→newest for the frontend.
  - `listConversations` is retained for any internal use that needs the full
    history (no callers changed; only bootstrap now uses the trimmed variant).

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
