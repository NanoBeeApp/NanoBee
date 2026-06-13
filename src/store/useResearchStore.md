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
- Upstream: `lib/api-client.ts` (typed RPC), `data/ids.ts`,
  `components/research/layout.ts`, `research/types.ts`.
- Downstream: every `components/research/*` component.

## Key implementation notes
- Kept separate from `useAppStore` so the large canvas state doesn't bloat the
  main store (App.tsx still drives view switching via `useAppStore.view`).
- `startResearch` generates an outline, flattens the tree into nodes, lays them
  out, and persists. `openNode` fills a stub node's article on demand.
  `growChild` creates a child optimistically (loading), generates its article,
  and focuses it. Snapshot saves are debounced (800ms).
- Generation goes through `POST /api/research/generate`, which reuses the
  user's chat provider config.

## Change history

### 2026-06-13 — Created
- **Motivation**: The merged Research Canvas needs client state + an AI/persist
  bridge, in NanoBee's optimistic-update + RPC style.
- **Goal**: One store that runs the whole canvas closed loop.
- **Key decision**: Snapshot-per-project persistence (debounced); a separate
  store rather than extending `useAppStore`.
