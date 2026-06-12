# email.ts

## Responsibility
Email + password auth endpoints: register (with verification code),
verify-email (logs the user in), resend-code and login.

## Core exports / API
- `emailAuthRoutes` — Hono sub-app:
  - `POST /register` `{ email, password, name? }` → `201 { needsVerification }`
    | `409 email_taken` | `429 too_many_codes` | `502 email_send_failed`
  - `POST /verify-email` `{ email, code }` → `{ ok, user }` + session cookie
    | `400 invalid_code`
  - `POST /resend-code` `{ email }` → `{ ok }` (does not reveal registration)
  - `POST /login` `{ email, password }` → `{ ok, user }` + session cookie
    | `401 invalid_credentials` | `400 no_password_set`
    | `403 email_not_verified` (auto-resends a code)

## Dependencies
- Upstream: `hono`, `@hono/zod-validator`, `zod`, `../../config`,
  `../../auth/{crypto,email,cookies,store}`
- Downstream: `routes/auth/index.ts`, login page (`LoginCard.tsx`), tests

## Notes
- Emails are normalized to lowercase by the zod schema.
- Re-registering an unverified address refreshes name/password and resends
  a code instead of failing — the mailbox owner has not been proven yet.
- Codes: 10 min TTL, 5 wrong attempts, 5 sends per hour per address.

## Change history

### 2026-06-12 — created
- **Motivation**: the product needs first-party accounts; OAuth alone
  excludes users without Google/GitHub.
- **Goal**: classic email+password with mandatory mailbox verification,
  modeled on the windchat-members flow but self-contained (no better-auth).
- **Key decision**: verify-email doubles as the login step after both
  registration and unverified-login, so the client has exactly one
  "enter the code" screen.
