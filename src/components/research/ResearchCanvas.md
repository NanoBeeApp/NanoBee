# components/research/ResearchCanvas.tsx

## File responsibility
The pan/zoom viewport that renders the node tree as positioned cards plus an SVG
edge layer (parent → child links).

## Core exports / API
- `ResearchCanvas()` — reads nodes/order/activeNodeId from the store.

## Dependencies
- Upstream: `store/useResearchStore.ts`, `ResearchNodeCard.tsx`, `layout.ts`.
- Downstream: `components/research/ResearchView.tsx`.

## Key implementation notes
- Transform (`tx/ty/scale`) lives in local state for performance; node
  coordinates come from the store's tidy-tree layout.
- Enters at a comfortable reading scale (0.9) and centers content the first time
  a project's nodes arrive. Drag background to pan; wheel to zoom around the
  cursor. Bézier edges connect parent bottom-center to child top-center.

## Change history

### 2026-06-13 — Created
- **Motivation**: Reproduce Curve's canvas interaction (comfortable-scale entry,
  pan/zoom, top-down framing) in a compact component on NanoBee's white surface.
- **Goal**: A self-contained viewport driven entirely by store state.
- **Key decision**: Local transform state + pointer/wheel handlers instead of a
  canvas library; SVG path edges with overflow:visible.
