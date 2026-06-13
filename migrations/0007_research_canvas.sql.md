# migrations/0007_research_canvas.sql

## File responsibility
Creates the `research_projects` table backing the Research Canvas feature.

## Schema
- `research_projects(id PK, owner, title, topic, snapshot_json, node_count,
  created_at, updated_at)` + index `(owner, updated_at DESC)`.
- One row per project; the full canvas snapshot (nodes + layout) is the
  `snapshot_json` blob.

## Dependencies
- Read/written by `worker/research/repo.ts`.

## Key implementation notes
- Applied locally with `pnpm db:migrate:local`, to dev with `db:migrate:dev`.
- Self-host parity: plain SQLite-compatible DDL, no Cloudflare-specific types.

## Change history

### 2026-06-13 — Created
- **Motivation**: Persist research projects from the merged Curve canvas.
- **Goal**: Minimal storage for the canvas closed loop.
- **Key decision**: JSON-blob-per-project instead of Curve's relational
  nodes/edges/followups tables; keeps reads/writes to one row for the MVP.
