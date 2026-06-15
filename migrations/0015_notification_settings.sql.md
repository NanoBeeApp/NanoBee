# migrations/0015_notification_settings.sql

## Purpose

Adds the `user_notification_settings` table that stores per-user notification
preferences: channel toggles (email and web-push), a do-not-disturb window,
daily digest mode, and an importance threshold.

The table is keyed by `user_id` (primary key). In-app notifications are always
on and are not stored here. A row is lazy-created on first GET of
`/api/notifications/settings`; the backend defaults (all channels on, no DND,
digest disabled) are returned and enforced when no row exists.

## Schema decisions

- `email_enabled` / `push_enabled`: INTEGER 0/1 booleans (D1 has no BOOLEAN type).
- `dnd_start` / `dnd_end`: nullable INTEGER minutes-from-midnight (0–1439 UTC).
  When both are NULL, DND is disabled. When `dnd_start > dnd_end` the window
  wraps midnight (e.g. 1320 start + 360 end = 22:00–06:00 UTC).
- `digest_time`: `HH:MM` string so it is human-readable without arithmetic.
- `importance_threshold`: TEXT enum (`low` | `normal` | `high`). Stored as TEXT
  rather than INTEGER to stay readable in raw SQL dumps.

## Change history

### 2026-06-15 — created
- **Motivation**: Add notification preference storage for the new notification
  settings UI and scheduler gating logic.
