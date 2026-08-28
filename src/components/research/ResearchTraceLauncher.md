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
- `placement="content"` is in-flow inside `.rc-reading-scroll` (above the
  title). `placement="outline"` stays tucked under the canvas banner.

## Change history

### 2026-08-28 — Content placement in document flow
- **Motivation**: absolute top-left positioning overlapped the reading title.
- **Goal**: content placement occupies flow so the heading stays fully visible.
- **Key decision**: CSS only (`.rc-trace-open--content` drops `position:
  absolute`); the host moves the launcher into the scroll column.

### 2026-06-15 — created
- **Motivation**: both the canvas (outline) and the reading overlay (article)
  need an entry button to inspect the generation process; the open/close state
  shouldn't bloat those host components.
- **Goal**: one reusable launcher that hosts the modal state for both placements.
- **Key decision**: a single component parameterized by `placement`, keeping the
  modal pure and the host components lean.
