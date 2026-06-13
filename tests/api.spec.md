# api.spec.ts

## Responsibility
Vitest integration tests for the Hono API worker: /health, /api/hello, the
auth system (register / login / verify / session / OAuth error paths), and
the NanoBee endpoints — bootstrap (seeded state), messages (create chat +
persist both sides + reply) and tasks (create / toggle / 404).

## Dependencies
- Upstream: a running dev server (`pnpm db:migrate:local && pnpm dev`)
- Run with `pnpm test:run` (override target via `API_BASE_URL`)

## Key notes
- Tests write to the shared local D1; ids are timestamped to avoid collisions.

## Change history

### 2026-06-13 — updates read-state tests removed
- **Motivation**: the read/unread feature was removed (routes `/api/updates/*`
  deleted, `unread` column dropped by migration 0006), so its tests went with it.

### 2026-06-12 — created
- **Motivation**: full-stack template init with D1; needed an automated proof
  that validation, inserts, unique constraints and queries work end to end.

### 2026-06-12 — NanoBee endpoint coverage
- **Motivation**: the D1 persistence MVP added four resource routes; each
  needed proof of the full write→read round-trip, not just a 2xx status.

### 2026-06-12 — auth coverage replaces the users smoke tests
- **Motivation**: the smoke-test `/api/users` endpoints were removed with
  the auth system; the new flows needed automated coverage that works
  without reading a mailbox.
- **Key decision**: register against Resend's `delivered+...@resend.dev`
  test inbox (accepted, delivered nowhere); the code-entry happy path is
  not automatable over HTTP by design (codes only live hashed in D1), so it
  is covered by the documented manual `LOG_EMAIL_CODES=1` flow instead.

### 2026-06-12 — default BASE_URL moved to port 3333
- **Motivation**: the local dev server now runs on a fixed port 3333
  (`server.port` in `vite.config.ts`), so the test fallback URL had to
  follow; `API_BASE_URL` still overrides it.

### 2026-06-12 — redirect_uri regression test added
- **Motivation**: a live `redirect_uri_mismatch` from Google showed the
  callback path is an external contract (the Google Cloud Console registers
  `…/api/auth/google/callback`); nothing in the suite pinned it.
- **Key decision**: assert the generated `redirect_uri` contains
  `/api/auth/google/callback`, so a future mount rename fails the suite
  instead of failing live logins with `redirect_uri_mismatch`.
