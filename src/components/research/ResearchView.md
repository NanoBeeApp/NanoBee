# components/research/ResearchView.tsx

## File responsibility
Research view container: switches welcome ↔ canvas, renders the slim top strip
(project title + generation status + new-research) and the reading overlay.
Imports the scoped `research.css`.

## Core exports / API
- `ResearchView()` — mounted by `App.tsx` when `view === "research"`.

## Dependencies
- Upstream: `store/useResearchStore.ts`, `icons/icons.tsx`,
  `ResearchWelcome.tsx`, `ResearchCanvas.tsx`, `ReadingOverlay.tsx`,
  `styles/research.css`.
- Downstream: `App.tsx`.

## Key implementation notes
- Phase-driven: welcome screen vs live canvas. Top strip stays minimal (per the
  maximize-content rule). CSS is imported here (same pattern as agent-trace.css).

## Change history

### 2026-06-13 — Created
- **Motivation**: Give the merged Research Canvas a single mount point inside
  NanoBee's existing two-column shell as a new view.
- **Goal**: Compose welcome / canvas / reading overlay behind one component.
- **Key decision**: Switch by store `phase`; keep chrome to a slim top strip.
