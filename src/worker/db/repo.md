# src/worker/db/repo.ts

## Responsibility
D1 row ↔ domain-type mapping for the NanoBee tables. Centralizes the SQL and
the JSON-payload (de)serialization so route handlers stay thin.

## Core exports / API
- `listChats(db)` → `ChatMeta[]` (authored order via rowid)
- `listConversations(db)` → `Record<chatId, ChatMessage[]>` (insertion order)
- `listTasks(db)` → `Task[]` (newest user-created first; seeds keep authored order)
- `getTask(db, id)` → `Task | null`
- `listUpdates(db)` → `UpdateItem[]`

## Dependencies
- Upstream: `src/types`, `@cloudflare/workers-types`
- Downstream: `routes/bootstrap.ts`, `routes/tasks.ts`

## Notes
- Hot/query fields (ids, topic, status, unread, group) are real columns; rich
  display content lives in a `payload` JSON column — see migration 0002.
- `listConversations` loads all messages in one query; fine at demo scale,
  paginate per chat when conversations grow.

## Change history

### 2026-06-12 — created
- **Motivation**: the first D1 endpoints inlined SQL in the route file; with
  four tables and JSON payloads the mapping needed one shared, typed home so
  every route deserializes rows identically.
