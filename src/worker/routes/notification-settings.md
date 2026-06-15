# src/worker/routes/notification-settings.ts

## Responsibility

Hono sub-router mounted at `/api/notifications` that exposes two endpoints
for per-user notification preferences:

- `GET  /settings` — returns the user's current settings; lazy-creates a row
  with sensible defaults (all channels on, no DND, digest disabled) on first call.
- `PUT  /settings` — validates (via `zValidator`) and upserts the user's
  notification preferences.

Both endpoints require a signed-in session (401 when signed out), following the
same auth pattern as `ai-settings.ts`.

## Exports

- `notificationSettingsRoutes` — `Hono<{ Bindings: Env }>` instance.
- `UserNotificationSettings` — TypeScript type for the settings object.
- `ImportanceThreshold` — `'low' | 'normal' | 'high'` union type.

## Key design decisions

- **Lazy row creation**: the GET handler inserts a defaults row when none exists,
  so the PUT handler can always use `ON CONFLICT DO UPDATE` without checking
  for existence first.
- **DND validation**: both `dndStart` and `dndEnd` must be null together or set
  together (the backend returns 400 otherwise).
- **No encryption**: notification preferences are not sensitive; stored as plain
  integers and text (unlike API keys which use AES-256-GCM).

## Dependencies

- `hono` / `@hono/zod-validator` / `zod` — routing + validation.
- `../auth/cookies` (`getSessionToken`) + `../auth/store` (`getUserBySessionToken`) — auth.
- `../api-worker` (`Env`) — D1 binding.

## Change history

### 2026-06-15 — created
- **Motivation**: store and expose user notification preferences for the
  notification settings UI and the scheduler gating logic.
