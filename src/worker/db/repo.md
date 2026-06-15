# src/worker/db/repo.ts

## Responsibility
D1 row ↔ domain-type mapping for the NanoBee tables. Centralizes the SQL and
the JSON-payload (de)serialization so route handlers stay thin.

## Core exports / API
- `listChats(db)` → `ChatMeta[]` (pinned first, then newest first; seeds keep authored order)
- `listConversations(db)` → `Record<chatId, ChatMessage[]>` (insertion order)
- `listTasks(db)` → `Task[]` (newest user-created first; seeds keep authored order)
- `getTask(db, id)` → `Task | null`
- `listUpdates(db)` → `UpdateItem[]`

## Dependencies
- Upstream: `src/types`, `@cloudflare/workers-types`
- Downstream: `routes/bootstrap.ts`, `routes/tasks.ts`

## Notes
- Hot/query fields (ids, topic, status, group) are real columns; rich
  display content lives in a `payload` JSON column — see migration 0002.
- `listConversations` loads all messages in one query; fine at demo scale,
  paginate per chat when conversations grow.

## Change history

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
