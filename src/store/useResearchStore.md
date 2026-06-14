# store/useResearchStore.ts

## File responsibility
Dedicated zustand store for the Research Canvas view: owns the current
project's node map, generation lifecycle, the reading-overlay selection, and
snapshot persistence.

## Core exports / API
- `useResearchStore` with state (`phase`, `projectId`, `nodes`, `order`,
  `activeNodeId`, `generating`, `projects`, `error`) and actions:
  `listProjects`, `startResearch`, `openNode`, `growChild`, `closeReading`,
  `loadProject`, `newResearch`.

## Dependencies
- Upstream: `lib/api-client.ts` (typed RPC), `data/ids.ts`, `research/types.ts`,
  `research/streaming.ts` (`extractStreamingContent`).
- Downstream: every `components/research/*` component.

## Key implementation notes
- Kept separate from `useAppStore` so the large canvas state doesn't bloat the
  main store (App.tsx still drives view switching via `useAppStore.view`).
- `startResearch` generates an outline and flattens the tree into nodes (each
  node keeps its `parentId`/`depth`; the canvas derives the outline structure).
  `openNode` fills a stub node's article on demand. `growChild` creates a child
  optimistically (loading), generates its article, and focuses it. Snapshot
  saves are debounced (800ms).
- Generation goes through `POST /api/research/generate`, which reuses the
  user's chat provider config.

## Change history

### 2026-06-14 — Stream content-mode generation (typewriter)
- **Motivation**: `openNode` / `growChild` filled a node's article via the
  one-shot `POST /generate` (`await res.json()`), so the reading overlay showed
  a spinner until the whole article popped in — the user noticed the streaming
  output was gone.
- **Goal**: type the body out live while the model generates, then settle the
  authoritative result (questions/summary/tags) from the stream's `final` event.
- **Key decision**: read `POST /api/research/generate-stream` via raw `fetch` +
  `getReader()` (the typed RPC client can't model SSE), reconstruct the model's
  raw JSON from `token` events and feed it through `extractStreamingContent` to
  update `node.content` per token. Outline mode keeps the non-stream `generate`
  (a tree, not a typed-out body). On stream failure, clear the partial
  `content` so the `openNode` guard (`|| node.content`) can't block a retry.
- **Motivation**: The canvas switched to a nested-outline hierarchical view that
  lays nodes out in document flow, so the `layoutNodes`/`relayout` pass that
  stamped `x`/`y` onto every node was dead work.
- **Goal**: Stop computing/persisting coordinates the renderer no longer reads.
- **Key decision**: Removed the `relayout` helper and the `layout.ts` import;
  node creation no longer sets `x`/`y`.

### 2026-06-13 — Created
- **Motivation**: The merged Research Canvas needs client state + an AI/persist
  bridge, in NanoBee's optimistic-update + RPC style.
- **Goal**: One store that runs the whole canvas closed loop.
- **Key decision**: Snapshot-per-project persistence (debounced); a separate
  store rather than extending `useAppStore`.
