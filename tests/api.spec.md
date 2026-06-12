# api.spec.ts

## Responsibility
Vitest integration tests for the Hono API worker: /health, /api/hello, the D1
users example, and the NanoBee endpoints — bootstrap (seeded state), messages
(create chat + persist both sides + reply), tasks (create / toggle / 404) and
updates (read flag / read-all / 404).

## Dependencies
- Upstream: a running dev server (`pnpm db:migrate:local && pnpm dev`)
- Run with `pnpm test:run` (override target via `API_BASE_URL`)

## Key notes
- Tests write to the shared local D1; ids are timestamped to avoid collisions,
  and update-tests restore the demo's initial unread state afterwards.

## Change history

### 2026-06-12 — created
- **Motivation**: full-stack template init with D1; needed an automated proof
  that validation, inserts, unique constraints and queries work end to end.

### 2026-06-12 — NanoBee endpoint coverage
- **Motivation**: the D1 persistence MVP added four resource routes; each
  needed proof of the full write→read round-trip, not just a 2xx status.
