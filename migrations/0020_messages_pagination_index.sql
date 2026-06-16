-- Migration 0020: composite index for message pagination queries.
--
-- Covers two hot query shapes that both filter on (owner, chat_id) and order
-- or filter on created_at:
--
--   (A) Bootstrap per-chat bounded fetch (listConversationsTrimmed):
--         SELECT id, created_at, payload FROM messages
--         WHERE owner = ? AND chat_id = ?
--         ORDER BY created_at DESC, id DESC LIMIT ?
--
--   (B) Cursor-based load-older pagination (listMessagesPage):
--         SELECT id, created_at, payload FROM messages
--         WHERE owner = ? AND chat_id = ? AND (created_at < ? OR (created_at = ? AND id < ?))
--         ORDER BY created_at DESC, id DESC LIMIT ?
--
-- Without this index both queries fall back to idx_messages_owner (owner,
-- created_at DESC) or idx_messages_chat (chat_id) — neither covers the
-- (owner, chat_id) filter together with created_at ordering.
--
-- With (owner, chat_id, created_at DESC, id DESC) SQLite can seek directly to
-- the right (owner, chat_id) partition and walk rows newest-first without a
-- separate sort step, making both queries O(LIMIT) instead of O(matching rows).
--
-- Note: rowid is a SQLite virtual column and cannot be used in CREATE INDEX.
-- created_at (unixepoch integer, second granularity) is used for ordering;
-- id (TEXT primary key) breaks ties within the same second.

CREATE INDEX IF NOT EXISTS idx_messages_owner_chat_pagination
  ON messages (owner, chat_id, created_at DESC, id DESC);

PRAGMA optimize;
