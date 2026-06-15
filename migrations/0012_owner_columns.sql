-- Migration 0012: multi-tenant data isolation for chats, messages, tasks, updates.
--
-- All four core app tables are promoted from a global shared pool to per-owner
-- buckets, exactly mirroring research_projects (0007) and artifacts (0008).
-- owner = signed-in user id (e.g. "u_abc123") OR the literal string "anon"
-- for signed-out visitors. Every existing row is backfilled to "anon" so the
-- DB stays valid and tests continue to pass without a wipe.

ALTER TABLE chats    ADD COLUMN owner TEXT NOT NULL DEFAULT 'anon';
ALTER TABLE tasks    ADD COLUMN owner TEXT NOT NULL DEFAULT 'anon';
ALTER TABLE updates  ADD COLUMN owner TEXT NOT NULL DEFAULT 'anon';
-- messages are always accessed via their parent chat_id join, so an owner
-- column on messages itself is not strictly needed for isolation — the chat
-- owner guards them. However, for fast bulk-delete ("delete all user data")
-- and to avoid a join on every message query, add it here too.
ALTER TABLE messages ADD COLUMN owner TEXT NOT NULL DEFAULT 'anon';

-- Existing rows (seed data) become the "anon" bucket.
UPDATE chats    SET owner = 'anon' WHERE owner IS NULL OR owner = '';
UPDATE messages SET owner = 'anon' WHERE owner IS NULL OR owner = '';
UPDATE tasks    SET owner = 'anon' WHERE owner IS NULL OR owner = '';
UPDATE updates  SET owner = 'anon' WHERE owner IS NULL OR owner = '';

-- Indexes mirror the artifacts/research pattern: (owner, created_at DESC).
CREATE INDEX idx_chats_owner    ON chats    (owner, created_at DESC);
CREATE INDEX idx_messages_owner ON messages (owner, created_at DESC);
CREATE INDEX idx_tasks_owner    ON tasks    (owner, created_at DESC);
CREATE INDEX idx_updates_owner  ON updates  (owner, created_at DESC);

PRAGMA optimize;
