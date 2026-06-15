# store.ts

## Responsibility
D1 persistence layer for the auth system: users, OAuth account links
(`auth_accounts`), server-side sessions (`auth_sessions`) and email
verification codes (`auth_email_codes`).

## Core exports / API
- Users: `findUserByEmail`, `createUser`, `getUserById`,
  `updateUserForReRegister`, `markEmailVerified`, `enrichUserProfile`
- Accounts: `findAccount(provider, providerAccountId)`, `linkAccount`
- Sessions: `createSession` (returns raw token, stores SHA-256 id),
  `getUserBySessionToken`, `deleteSessionByToken`
- Codes: `saveEmailCode`, `consumeEmailCode` (single-use, attempt-limited),
  `countRecentCodes` (hourly rate limit)
- `AuthUser` type

## Dependencies
- Upstream: `nanoid`, `../config` (TTLs/limits), `./crypto`
- Downstream: `routes/auth/*` handlers

## Notes
- Session ids are `sha256(token)`; the raw token only ever lives in the
  cookie. Lookup joins `users` and checks `expires_at` in SQL.
- Codes are stored as `sha256(email:code)`; a wrong guess burns one attempt
  on every live code for that email (max 5) to block brute force.
- Lazy cleanup: `createSession` deletes expired sessions, `saveEmailCode`
  deletes codes older than the 1h rate-limit window.

## Change history

### 2026-06-15 — fix nullable last_seen_at (migration compatibility)
- **Motivation**: SQLite `ALTER TABLE ADD COLUMN` rejects non-constant DEFAULT
  expressions (`unixepoch()`); migration 0016 was failing with SQLITE_ERROR.
- **Goal**: keep `last_seen_at` working while passing the migration.
- **Key changes**: `SessionInfo.lastSeenAt` changed from `number` to
  `number | null`; DB row type updated to match; `ORDER BY last_seen_at DESC`
  still works (NULLs sort last in DESC, which is fine for legacy rows).

### 2026-06-15 — account management additions
- **Motivation**: implement password-reset, session management, account deletion,
  data export, and change-name/password endpoints.
- **Goal**: add all persistence functions for the new account management features.
- **Key changes**:
  - `saveEmailCode` now delegates to new `saveEmailCodeWithPurpose('verify')`.
  - New `saveEmailCodeWithPurpose(purpose)` and `countRecentCodesForPurpose`
    for reset vs. verify separation (migration 0016 adds `purpose` column).
  - `consumeEmailCode` gains a `purpose` param (default `'verify'` for backward
    compatibility); rate-limit burns and success deletion are now purpose-scoped.
  - `getUserBySessionToken` fires a fire-and-forget `last_seen_at` touch (migration 0016
    adds that column); new `getUserAndSessionId` variant returns both.
  - Session management: `listUserSessions`, `deleteSessionById`, `deleteOtherSessions`,
    `deleteAllUserSessions`.
  - Profile updates: `updateUserName`, `updateUserPassword` (with session revocation),
    `getUserRowForExport`.

### 2026-06-12 — created
- **Motivation**: auth routes needed storage; the project deliberately uses
  raw D1 prepared statements (no ORM), so the auth tables follow the same
  repo-module pattern as `worker/db/repo.ts`.
- **Goal**: one module owning every auth SQL statement so handlers stay thin.
- **Key decision**: hash-at-rest for both session tokens and email codes;
  merge OAuth identities into existing users only via provider-verified
  emails (see `routes/auth/oauth.ts`).

### 2026-06-12 — review fixes
- **Motivation**: code review flagged unbounded growth of expired
  sessions/codes.
- **Goal**: keep the tables tidy without a cron.
- **Key decision**: lazy cleanup on the write paths instead of a scheduled
  job — negligible cost, no new infrastructure.
