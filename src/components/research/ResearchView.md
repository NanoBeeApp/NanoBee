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
- Upstream: `store/useResearchStore.ts`, `icons/icons.tsx`,
  `ResearchWelcome.tsx`, `ResearchCanvas.tsx`, `ReadingOverlay.tsx`,
  `styles/research.css`.
- Downstream: `App.tsx`.

## Key implementation notes
- Phase-driven: welcome screen vs live canvas. No header — the topic shows in the
  canvas banner instead. New-research is a sidebar entry (ResearchNavList), not a
  canvas button; only a transient status/error pill floats top-left, opposite the
  global top-right FloatingControls cluster. CSS is imported here.

## Change history

### 2026-06-13 — Drop the canvas "新研究" button (new-research → sidebar)
- **Motivation**: The user wants creating a new research to live solely in the
  left sidebar (ResearchNavList already has a "新研究" entry), not on the canvas.
- **Goal**: Keep the canvas chrome to the bare minimum.
- **Key decision**: Removed the floating "新研究" button; the top-left cluster now
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
