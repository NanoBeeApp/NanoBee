-- Migration 0015: per-user notification preferences.
--
-- Stores channel toggles (email on/off, web-push on/off — in-app is always on),
-- a do-not-disturb window (minutes from midnight UTC), digest mode settings,
-- and an importance threshold that splits immediate vs. digest delivery.
--
-- Lazy-created on first GET by the /api/notifications/settings route, so no
-- row exists for users who have never opened the settings page. The route
-- returns and applies sensible defaults in that case (all channels on, no DND,
-- daily digest disabled).

CREATE TABLE user_notification_settings (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Channel toggles
  email_enabled   INTEGER NOT NULL DEFAULT 1,   -- 0 = off, 1 = on
  push_enabled    INTEGER NOT NULL DEFAULT 1,   -- web-push; 0 = off, 1 = on

  -- Do-not-disturb window (both nullable = DND disabled)
  -- Values are minutes from midnight UTC (0–1439).
  -- When dnd_start > dnd_end the window wraps midnight (e.g. 22:00–06:00).
  dnd_start       INTEGER,                      -- NULL = DND disabled
  dnd_end         INTEGER,                      -- NULL = DND disabled

  -- Digest mode
  digest_enabled  INTEGER NOT NULL DEFAULT 0,   -- 0 = immediate, 1 = daily digest
  digest_time     TEXT NOT NULL DEFAULT '08:00', -- HH:MM UTC wall-clock time for digest delivery

  -- Importance threshold: items at or above this level interrupt immediately;
  -- items below are queued for the digest (when digest_enabled = 1).
  -- Values: 'low' | 'normal' | 'high' — 'normal' is the default interruption floor.
  importance_threshold TEXT NOT NULL DEFAULT 'normal',

  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user
  ON user_notification_settings (user_id);

PRAGMA optimize;
