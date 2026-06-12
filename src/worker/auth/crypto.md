# crypto.ts

## Responsibility
Auth crypto primitives on WebCrypto (Workers-compatible, zero dependencies):
PBKDF2 password hashing, random session tokens, 6-digit email codes,
SHA-256 hashing and HMAC-signed OAuth state.

## Core exports / API
- `hashPassword(password)` / `verifyPassword(password, stored)` —
  PBKDF2-SHA256, 100k iterations (Workers cap), self-describing
  `pbkdf2$iter$salt$hash` format, constant-time compare
- `randomToken()` — 256-bit base64url token for session cookies
- `randomEmailCode()` — 6-digit verification code
- `sha256Hex(value)` — used to store hashed session tokens / codes
- `signOAuthState(state, secret)` / `verifyOAuthState(value, secret, maxAgeMs)`
  — HMAC-SHA256 signed `payload.signature` state for the OAuth round-trip
- `toBase64Url` / `fromBase64Url` helpers, `OAuthState` type

## Dependencies
- Upstream: none (WebCrypto globals only)
- Downstream: `auth/store.ts`, `routes/auth/email.ts`, `routes/auth/oauth.ts`

## Notes
- Never call `crypto.getRandomValues` at module scope (Workers global-scope
  restriction); everything here runs inside request handlers.
- PBKDF2 iterations are capped at 100,000 by the Workers runtime.

## Change history

### 2026-06-12 — created
- **Motivation**: the auth system needs password hashing and signed OAuth
  state, but Workers has no node `crypto` and we did not want a heavy
  dependency (better-auth + ORM adapter) for four primitives.
- **Goal**: a small, audited-by-review crypto module that the whole auth
  feature shares.
- **Key decision**: store SHA-256 hashes of session tokens (not raw tokens)
  so a leaked DB dump cannot be replayed as cookies; HMAC state instead of
  a server-side state store to stay stateless across the redirect.
