# config.ts

## Responsibility
Single source of truth for backend constants (API prefix, CORS settings,
default list limit). Route files must reference this instead of hardcoding.

## Core exports / API
- `CONFIG` — frozen constants object

## Dependencies
- Upstream: none
- Downstream: `api-worker.ts`, `routes/api.ts`

## Change history

### 2026-06-12 — created
- **Motivation**: template init; repo rule forbids duplicating magic
  strings/numbers across files.
- **Goal**: one place to change CORS/limits later.

### 2026-06-12 — `as const` removed
- **Motivation**: `hono/cors` expects mutable `string[]` options; the
  template's `as const` made them `readonly` tuples and failed typecheck.

### 2026-06-12 — switch project domain to nanobee.app
- **Motivation**: the project got its own domain `nanobee.app`; the previous
  `windseed.app` sender address belonged to another project.
- **Goal**: default email sender becomes `NanoBee <noreply@nanobee.app>`.
