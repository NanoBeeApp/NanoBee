# worker/routes/research.ts

## File responsibility
Hono routes for the Research Canvas: AI node generation + project snapshot CRUD.

## Core exports / API
- `researchRoutes` (mounted at `/api/research` in `routes/api.ts`):
  - `POST /generate` — generate one node (outline/content/deep-dive).
  - `GET /projects` — list the owner's projects.
  - `GET /snapshots/:id` — load one snapshot (404 if missing/not owned).
  - `POST /snapshots` — save a snapshot (upsert).
  - `DELETE /projects/:id` — delete a project.

## Dependencies
- Upstream: `worker/ai/settings.ts`, `worker/auth/{cookies,store}.ts`,
  `worker/research/{generate,repo}.ts`, `research/types.ts`, zod.
- Downstream: mounted by `worker/routes/api.ts`; consumed via the typed RPC
  client by `store/useResearchStore.ts`.

## Key implementation notes
- Generation resolves the same per-user `AiRuntimeConfig` as chat, so a user's
  configured provider powers both features.
- `ownerOf(c)` maps the session to an owner bucket (user id or "anon").
- Snapshot body is validated leniently (envelope strict, node fields
  passthrough) so the client can evolve node shape without a schema bump.

## Change history

### 2026-06-13 — Created
- **Motivation**: Expose research generation + persistence to the canvas client.
- **Goal**: A small, typed surface mirroring Curve's `/api/ai/generate` +
  `/api/research/snapshots` endpoints.
- **Key decision**: Owner-scoped, anon-bucket fallback; lenient snapshot schema.
