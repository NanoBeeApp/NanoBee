# worker/research/repo.ts

## File responsibility
D1 persistence for research projects: list / load / save / delete, one JSON
snapshot row per project, scoped to an owner bucket.

## Core exports / API
- `ANON_OWNER` — owner bucket for signed-out visitors.
- `listResearchProjects(db, owner)` → `ResearchProjectMeta[]`.
- `loadResearchSnapshot(db, owner, projectId)` → `ResearchSnapshot | null`.
- `saveResearchSnapshot(db, owner, snapshot)` — upsert (full overwrite).
- `deleteResearchProject(db, owner, projectId)`.

## Dependencies
- Upstream: D1 (`research_projects` table, migration 0007), `research/types.ts`.
- Downstream: `worker/routes/research.ts`.

## Key implementation notes
- One row per project; the whole canvas snapshot is a JSON blob, mirroring
  Curve's snapshot save/load API with simpler storage.
- Owner-scoped queries prevent cross-user reads; signed-out visitors share the
  "anon" bucket (consistent with NanoBee's currently-global app data).

## Change history

### 2026-06-13 — Created
- **Motivation**: The canvas must persist and restore projects across reloads.
- **Goal**: Minimal CRUD over a single snapshot table.
- **Key decision**: JSON-blob-per-project (vs Curve's relational nodes/edges)
  for the MVP; revisit if cross-project querying is needed.
