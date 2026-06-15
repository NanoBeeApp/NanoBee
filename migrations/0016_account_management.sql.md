# Migration 0016 — Account Management

Adds schema support for the full account management feature set (password reset,
session management, data export, account deletion).

## Changes

### `auth_email_codes.purpose`
A `TEXT NOT NULL DEFAULT 'verify'` discriminator column that separates email
verification codes from password-reset codes. Without this column a reset code
could accidentally be consumed by the verify-email endpoint (or vice-versa).
Two values in use: `'verify'` and `'reset'`.

### `auth_sessions.last_seen_at`
An `INTEGER NOT NULL DEFAULT (unixepoch())` timestamp updated by the session
lookup on every authenticated request (via `touchSessionLastSeen` in the store).
Powers the "last active" display in the session management UI.

### Index `idx_auth_sessions_user_expires`
Covers the `(user_id, expires_at)` pair used by the "list active sessions"
query, which filters out expired rows in the same pass.

## Change history & rationale

- 2026-06-15 — initial creation for account management feature (agent run).
