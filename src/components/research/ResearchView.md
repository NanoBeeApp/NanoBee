# components/research/ResearchView.tsx

## File responsibility
Research view container: switches welcome ↔ canvas and renders the reading
overlay. There is no header bar — the canvas fills the surface. Starting a new
research lives in the left sidebar (ResearchNavList); the only floating canvas
chrome is a transient generation-status / error pill. Imports the scoped
`research.css`.

## Core exports / API
- `ResearchView()` — mounted by `App.tsx` when `view === "research"`.

## Dependencies
- Upstream: `store/useResearchStore.ts`, `useResearchUrlSync.ts`,
  `icons/icons.tsx`, `ResearchWelcome.tsx`, `ResearchCanvas.tsx`,
  `ReadingOverlay.tsx`, `styles/research.css`.
- Downstream: `App.tsx`.

## Key implementation notes
- Phase-driven: welcome screen vs live canvas. No header — the topic shows in the
  canvas banner instead. New-research is a sidebar entry (ResearchNavList), not a
  canvas button; only a transient status/error pill floats top-left, opposite the
  global top-right FloatingControls cluster. CSS is imported here.
- Calls `useResearchUrlSync()` once at the top (unconditionally, before the
  phase branch) to keep `?project=&node=` and the store in sync.
- Renders the canvas with `key={projectId}` so it re-mounts per topic — each
  project initialises/restores its own saved pan/zoom independently (see
  `ResearchCanvas` viewport memory).

## Change history

### 2026-06-17 — Feed the quick-chat "正在看 · …" context from the canvas
- **Motivation**: The quick chat should know which node the user is currently
  looking at on the canvas (so its chip is specific and the model grounds answers
  in that node), mirroring how TodayView reports the in-view article.
- **Goal**: Keep `useAppStore.quickCtx` in sync with the focused research node.
- **Key decision**: An effect mirrors `activeNodeId ?? highlightedNodeId` (and its
  title) into `setQuickCtx`, and clears it on unmount. Selectors read only the id +
  title so streaming a node's body doesn't thrash the context.

### 2026-06-14 — Re-mount the canvas per topic (`key={projectId}`)
- **Motivation**: per-topic canvas pan/zoom memory needs each project to start
  from its own saved viewport; keeping one long-lived canvas across topic
  switches made restore-on-switch fight React's setState-in-effect rules.
- **Goal**: give each topic a clean mount so its viewport simply *initialises*
  from storage.
- **Key decision**: key `ResearchCanvas` by `projectId`; switching topics
  unmounts the old canvas (flushing its viewport) and mounts a fresh one.

### 2026-06-14 — Mount the URL ↔ store sync hook

### 2026-06-14 — Mount the URL ↔ store sync hook
- **Motivation**: opening an article (or a project) only mutated the store, so
  the reading overlay had no URL and was lost on refresh / couldn't be bookmarked.
- **Goal**: bind the view's bookmarkable state to the URL without bloating this
  container.
- **Key decision**: call the dedicated `useResearchUrlSync()` here (the route
  component is the natural single mount point), keeping the sync logic isolated.

### 2026-06-13 — Drop the canvas "New Research" button (new-research → sidebar)
- **Motivation**: The user wants creating a new research to live solely in the
  left sidebar (ResearchNavList already has a "New Research" entry), not on the canvas.
- **Goal**: Keep the canvas chrome to the bare minimum.
- **Key decision**: Removed the floating `"新研究"` ("New Research") button; the top-left cluster now
  renders only when there's generation status / an error to show.

### 2026-06-13 — Remove the top header bar
- **Motivation**: The full-width `.rc-topbar` kept colliding with the global
  top-right FloatingControls (notification / settings / account avatar), and that
  cluster grows over time. The user asked to remove the header.
- **Goal**: Let the canvas own the full surface; keep only the essential action.
- **Key decision**: Drop the bar entirely; reclaim the vertical space and float
  the reading overlay above the global controls.

### 2026-06-13 — Created
- **Motivation**: Give the merged Research Canvas a single mount point inside
  NanoBee's existing two-column shell as a new view.
- **Goal**: Compose welcome / canvas / reading overlay behind one component.
- **Key decision**: Switch by store `phase`; keep chrome to a slim top strip.
