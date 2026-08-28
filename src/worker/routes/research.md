# worker/routes/research.ts

## File responsibility
Hono routes for the Research Canvas: AI node generation + project snapshot CRUD.

## Core exports / API
- `researchRoutes` (mounted at `/api/research` in `routes/api.ts`):
  - `POST /generate` — generate one node (outline/content/deep-dive), one-shot
    JSON. On failure returns `502 { error, trace }` (the failure trace, if any).
  - `POST /generate-stream` — streaming sibling for content *and* outline:
    emits a `start` event immediately (keeps proxies / the Worker from treating
    a long model call as a hung request), then SSE `token` events as the body
    streams, then a `final` event (validated result, with a `trace`) or an
    `error` event (`{ message, trace }`). Tokens are JSON-encoded so newlines
    never break SSE framing. Outline clients ignore tokens and wait for `final`.
  - `GET /projects` — list the owner's projects.
  - `GET /snapshots/:id` — load one snapshot (404 if missing/not owned).
  - `POST /snapshots` — save a snapshot (upsert).
  - `DELETE /projects/:id` — delete a project.

## Dependencies
- Upstream: `worker/ai/settings.ts`, `worker/auth/{cookies,store}.ts`,
  `worker/research/{generate,repo}.ts`, `research/types.ts`,
  `research/styles.ts` (`RESEARCH_STYLE_IDS` for the generate enum), zod.
- Downstream: mounted by `worker/routes/api.ts`; consumed via the typed RPC
  client by `store/useResearchStore.ts`.

## Key implementation notes
- Generation resolves the same per-user `AiRuntimeConfig` as chat, so a user's
  configured provider powers both features.
- `ownerOf(c)` maps the session to an owner bucket (user id or "anon").
- Snapshot body is validated leniently (envelope strict, node fields
  passthrough) so the client can evolve node shape without a schema bump.

## Change history

### 2026-08-28 — Emit SSE `start` before the model call
- **Motivation**: outline generation can sit silent for ~100s; a one-shot or
  idle stream was killed with 0 bytes, so the canvas never left the skeleton.
- **Goal**: the first SSE frame must leave the Worker before `streamAgentText`.
- **Key decision**: write `{ event: "start", data: { ok: true } }` immediately
  inside `streamSSE`, then a 15s `ping` heartbeat so a silent repair retry
  cannot look like a hung connection. Clients may ignore both.

### 2026-06-18 — Accept `style` in the generate schema
- **Motivation**: the client sends the user's AI reply style (`科普 / 专业 /
  简练`) with each generate request so the prompt can re-shape its output.
- **Key decision**: added `style: z.enum(RESEARCH_STYLE_IDS).optional()` to
  `generateSchema`; the validated input already flows into
  `generateResearchNode(Stream)` → `buildResearchMessages`, so no other route
  change was needed.

### 2026-06-15 — Return the generation trace (success + failure)
- **Motivation**: the UI needs the generation execution trace to debug how the
  outline/article were produced — including when a run fails.
- **Goal**: surface the trace on both endpoints without a new route.
- **Key decision**: the success result already carries `trace` (from
  `generate.ts`); on failure, extract the trace from a `ResearchGenerationError`
  and return it in the `502` body (`/generate`) or on the `error` SSE event as
  `{ message, trace }` (`/generate-stream`).

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

### 2026-06-14 — Accept `focusParagraph` in the generate schema (Phase B)
- **Motivation**: the client now sends the deep-dive anchor's enclosing
  paragraph; the route must let it through to the prompt.
- **Goal**: add `focusParagraph` (≤2000 chars) to `generateSchema`.
- **Key decision**: validated input flows unchanged into `buildResearchMessages`,
  so no other route logic changes.

### 2026-06-14 — Allow `userQuestionTurns` in the snapshot schema (Phase C)
- **Motivation**: inline Q&A turns live on the node; without a schema entry the
  zod-validated snapshot would strip them on save, losing them on reload.
- **Goal**: add an optional `userQuestionTurns` array to `nodeSchema`.
- **Key decision**: mirror the `ResearchQnaTurn` shape exactly so persisted
  turns round-trip through D1.
