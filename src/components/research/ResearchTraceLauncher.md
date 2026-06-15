# src/components/research/ResearchTraceLauncher.tsx

## Responsibility
Renders the "查看生成过程" entry button and owns the open/close state for the
`ResearchTraceModal`. Reused in two placements: under the canvas research banner
(outline generation) and inside the reading overlay (article generation). The
container half of the container/presentational split with `ResearchTraceModal`.

## Core exports / API
- `ResearchTraceLauncher({ trace, placement })` — `placement` is
  `"outline" | "content"`, which drives the button label, position and testid
- Testids: `research-outline-trace-button` / `research-content-trace-button`

## Dependencies
- Upstream: `ResearchCanvas.tsx` (outline placement),
  `ReadingOverlay.tsx` (content placement)
- Downstream: `ResearchTraceModal.tsx`, `research/generation-trace` (type),
  `styles/research-trace.css`, icons

## Notes
- Pure entry point: it only opens the modal — the trace itself is read from the
  store by the host component and passed in as a prop, so this stays stateless
  apart from the boolean open flag.

## Change history

### 2026-06-15 — created
- **Motivation**: both the canvas (outline) and the reading overlay (article)
  need an entry button to inspect the generation process; the open/close state
  shouldn't bloat those host components.
- **Goal**: one reusable launcher that hosts the modal state for both placements.
- **Key decision**: a single component parameterized by `placement`, keeping the
  modal pure and the host components lean.
