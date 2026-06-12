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
