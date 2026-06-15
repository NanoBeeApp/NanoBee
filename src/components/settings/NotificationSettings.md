# src/components/settings/NotificationSettings.tsx

## Responsibility

Settings detail pane for notification preferences, rendered inside the shared
master-detail layout on the `/settings` page. Covers:

- **Channels** — in-app (always on, disabled toggle), email, web-push toggles.
- **Web Push opt-in** — device-level `usePushNotifications` subscribe/unsubscribe
  control; shown only when `pushEnabled` is true; gracefully hidden/disabled
  when VAPID is not configured on the server.
- **Do Not Disturb** — toggle + `HH:MM` start/end time inputs (UTC). The
  minute-from-midnight conversion is done locally; the server stores raw
  integer minutes.
- **Digest mode** — toggle + digest delivery time input.
- **Importance threshold** — three-pill radio group (`low` / `normal` / `high`).

All changes auto-save after a 700 ms debounce (same as `AiSettingsForm`).

## Core exports

- `NotificationSettings({ userEnabled })` — the section component; receives
  `userEnabled: boolean` so it can gate the settings query on auth state.

## Dependencies

- `../../lib/useNotificationSettings` — `useNotificationSettings` query +
  `useSaveNotificationSettings` mutation.
- `../../lib/usePushNotifications` — `usePushNotifications` hook for the
  device-level subscribe/unsubscribe control.
- `../../icons/icons` — `Icons.bell`, `Icons.smartphone`.

## Key notes

- Local state is seeded from server data exactly once (via `seededRef`), then
  the user edits locally and the payload is auto-saved.
- DND is managed as a boolean `dndEnabled` + two `HH:MM` string inputs locally,
  then converted to `dndStart/dndEnd` minutes on save.
- The `Toggle` sub-component is file-local (simple checkbox + styled track/thumb).

## Change history

### 2026-06-15 — created
- **Motivation**: expose the new `user_notification_settings` row through a
  settings UI, and wire in the existing `usePushNotifications` opt-in control
  that was previously orphaned.
