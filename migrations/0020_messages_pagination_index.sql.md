# migrations/0020_messages_pagination_index.sql

## Purpose
Adds a composite index `idx_messages_owner_chat_pagination ON messages (owner, chat_id, created_at DESC, id DESC)` to make the two message-pagination query shapes fully indexed.

## Covered query shapes
1. **Bootstrap per-chat bounded fetch** (`listConversationsTrimmed`):
   `WHERE owner=? AND chat_id=? ORDER BY created_at DESC, id DESC LIMIT ?`
2. **Cursor-based load-older pagination** (`listMessagesPage`):
   `WHERE owner=? AND chat_id=? AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC, id DESC LIMIT ?`

Without this index both queries fall back to `idx_messages_owner (owner, created_at DESC)` or `idx_messages_chat (chat_id)`, forcing a post-filter sort. With the composite index SQLite seeks the (owner, chat_id) partition and walks rows newest-first in O(LIMIT).

## Why not rowid?
SQLite's `rowid` is a virtual column alias (not a real schema column) and **cannot appear in `CREATE INDEX`**. Attempting `ON messages (owner, chat_id, rowid DESC)` causes `SQLITE_ERROR: no such column: rowid`. The `(created_at, id)` pair provides equivalent ordering: `created_at` is monotonically non-decreasing with insertion order, and `id` (a nanoid TEXT primary key) breaks ties within the same second.

## Change history

### 2026-06-15 — created; then fixed (rowid → created_at + id)
- **Motivation**: code-review finding (high severity) — no composite index covering the pagination queries. The bootstrap fix (0020 companion in repo.ts) switched to N+1 per-chat bounded queries, which makes this index the hot path for every bootstrap and load-older call.
- **Fix**: original draft used `(owner, chat_id, rowid DESC)` which fails with `SQLITE_ERROR: no such column: rowid`. Corrected to `(owner, chat_id, created_at DESC, id DESC)` using real schema columns. Pagination cursor in repo.ts/store/route updated accordingly from `rowid: number` to opaque `"<created_at>_<id>"` string.
