# cookies.ts

## Responsibility
Session cookie read/write helpers shared by every auth route
(name, flags and lifetime in one place).

## Core exports / API
- `setSessionCookie(c, token, expiresAt)` — HttpOnly + SameSite=Lax +
  Secure-on-HTTPS, `Path=/`
- `clearSessionCookie(c)`
- `getSessionToken(c)` → `string | undefined`

## Dependencies
- Upstream: `hono/cookie`, `../config` (cookie name)
- Downstream: `routes/auth/email.ts`, `routes/auth/oauth.ts`,
  `routes/auth/session.ts`

## Notes
- `Secure` is derived from the request protocol so local HTTP dev keeps
  working while production (HTTPS) always gets the flag.
- SameSite=Lax + POST-only mutations is the CSRF posture; the OAuth
  callback GET is protected by the signed state instead.

## Change history

### 2026-06-12 — created
- **Motivation**: three route modules all need identical cookie handling;
  duplicating flag logic invites drift (e.g. someone forgetting HttpOnly).
- **Goal**: one tiny module owning the cookie contract.
- **Key decision**: cookie name `nb_session` lives in `CONFIG.AUTH`, not
  hardcoded, per the repo's no-magic-strings rule.
