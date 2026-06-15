# account.ts

## Responsibility
Account management endpoints mounted under `/api/auth`:
- `POST /forgot-password` — rate-limited reset code via email (never reveals registration status)
- `POST /reset-password` — consume code, set new PBKDF2 hash, invalidate all sessions
- `PATCH /account/name` — change display name (requires session)
- `POST /account/password` — change password (current password required; keeps current session)
- `GET /sessions` — list active non-expired sessions with current-session flag
- `POST /sessions/revoke` — revoke one session or all-others
- `GET /export` — full JSON export of all user-owned data (never includes encrypted keys)
- `DELETE /account` — purge all data, auth rows, cookie; requires `confirm: "DELETE"` body

## Error codes (stable, mapped to copy on the frontend)
- `invalid_code` — wrong or expired reset code (also used when email not found, to avoid enumeration)
- `email_send_failed` — Resend delivery failure
- `no_password_set` — OAuth-only account has no password
- `invalid_credentials` — wrong current password on change-password
- `session_id_required` — revoke called with mode=one but no sessionId
- `cannot_revoke_current` — tried to revoke the active session via revoke (use /logout)
- `Unauthorized` — no valid session cookie

## Dependencies
- Upstream: `../../auth/store`, `../../auth/crypto`, `../../auth/email`, `../../auth/cookies`, `../../config`
- Downstream: `./index.ts` (mounted here), frontend `useAccount.ts`

## Notes
- `forgot-password` is deliberately silent on unregistered/unverified emails.
- `reset-password` invalidates ALL sessions so the user must re-login after reset.
- `DELETE /account` uses `db.batch()` for atomicity across all delete statements.
- Data export never includes encrypted API keys — only the provider names.

## Change history & rationale

- 2026-06-15 — initial creation for account management feature (agent run).
