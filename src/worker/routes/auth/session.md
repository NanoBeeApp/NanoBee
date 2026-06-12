# session.ts

## Responsibility
Session endpoints: resolve the current cookie session (`/me`) and
log out (`/logout`).

## Core exports / API
- `sessionRoutes` — Hono sub-app:
  - `GET /me` → `{ user }` or `{ user: null }` (also clears a dead cookie)
  - `POST /logout` → `{ ok: true }` (deletes the server session + cookie)

## Dependencies
- Upstream: `../../auth/cookies`, `../../auth/store`
- Downstream: `routes/auth/index.ts`, `src/lib/useAuth.ts`

## Notes
- `/me` never errors for anonymous visitors — `user: null` keeps the
  frontend query simple and cacheable.

## Change history

### 2026-06-12 — created
- **Motivation**: the app shell needs a cheap "who am I" endpoint and a
  proper server-side logout (cookie deletion alone leaves the session row
  valid).
- **Goal**: minimal session surface for the React layer.
- **Key decision**: clear the cookie when the session row is missing or
  expired so clients self-heal after DB resets.
