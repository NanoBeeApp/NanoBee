-- Migration 0016: account management additions.
--
-- 1. Add `purpose` to auth_email_codes so password-reset codes are separate
--    from email-verification codes (no cross-purpose consumption).
-- 2. Add `last_seen_at` and `user_agent` is already in auth_sessions; add
--    `created_at` is already there. Add `last_seen_at` which is missing.
-- 3. `name` in auth_sessions is not worth adding — user_agent already covers it.
--    We only need to surface last_seen so the sessions list is useful.

-- Add purpose discriminator to email codes (verify | reset).
-- Existing rows are treated as 'verify' so the migration is safe to apply
-- to a live database without breaking in-flight verification flows.
ALTER TABLE auth_email_codes ADD COLUMN purpose TEXT NOT NULL DEFAULT 'verify';

-- Add last-seen timestamp to sessions so the UI can show "last active".
-- SQLite ALTER TABLE ADD COLUMN does not accept non-constant DEFAULT
-- expressions (e.g. unixepoch()), so this column is nullable.
-- Existing/legacy rows will have NULL (meaning "unknown"); the application
-- layer falls back to created_at when last_seen_at IS NULL.
-- New sessions always have last_seen_at set explicitly by the auth store.
ALTER TABLE auth_sessions ADD COLUMN last_seen_at INTEGER;

-- Index to support queries like "all active sessions for user X".
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_expires
  ON auth_sessions (user_id, expires_at);

PRAGMA optimize;
