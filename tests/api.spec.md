# api.spec.ts

## Responsibility
Vitest integration tests for the Hono API worker, covering /health,
/api/hello and the D1-backed /api/users endpoints (create, duplicate-email
conflict, validation failure, list).

## Dependencies
- Upstream: a running dev server (`pnpm db:migrate:local && pnpm dev`)
- Run with `pnpm test:run` (override target via `API_BASE_URL`)

## Change history

### 2026-06-12 — created
- **Motivation**: full-stack template init with D1; needed an automated proof
  that validation, inserts, unique constraints and queries work end to end.
