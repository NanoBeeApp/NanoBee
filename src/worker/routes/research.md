# worker/routes/research.ts

## File responsibility
Hono routes for the Research Canvas: AI node generation + project snapshot CRUD.

## Core exports / API
- `researchRoutes` (mounted at `/api/research` in `routes/api.ts`):
  - `POST /generate` — generate one node (outline/content/deep-dive), one-shot JSON.
  - `POST /generate-stream` — content-mode streaming sibling: emits SSE `token`
    events as the body streams, then a `final` event (validated result) or an
    `error` event. Tokens are JSON-encoded so newlines never break SSE framing.
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

### 2026-06-14 — Add POST /generate-stream (SSE)
- **Motivation**: restore the reading detail page's live/typewriter output,
  which the one-shot `/generate` could never produce.
- **Goal**: stream content-mode tokens to the client, then hand it a validated
  final result, with the same per-user provider config and error semantics.
- **Key decision**: validate the AI config and return a clean `400` BEFORE
  opening the stream (an opened SSE response can't change its HTTP status); use
  `hono/streaming` `streamSSE`; JSON-encode every event's `data` so embedded
  newlines in tokens can't be mis-read as SSE frame boundaries.
