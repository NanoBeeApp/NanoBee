# components/research/ResearchCanvas.tsx

## File responsibility
The pan/zoom viewport that renders the node tree as a nested outline
(hierarchical view): a research-topic banner followed by outline items, each
indented under its parent along a vertical rail.

## Core exports / API
- `ResearchCanvas()` — reads nodes/order/activeNodeId from the store.
- `NodeBranch` (internal) — recursive outline node + its indented children.

## Dependencies
- Upstream: `store/useResearchStore.ts`, `ResearchNodeCard.tsx`, `research/types.ts`.
- Downstream: `components/research/ResearchView.tsx`.

## Key implementation notes
- Structure is derived from each node's `parentId` + the store `order` via
  `buildChildrenMap`; there are no per-node coordinates. The browser lays the
  outline out in normal document flow.
- Transform (`tx/ty/scale`) lives in local state for performance. The
  fixed-width outline column (`OUTLINE_WIDTH`) is horizontally centered the first
  time a project's nodes arrive. Drag background to pan; ctrl/⌘+wheel (or pinch)
  zooms around the cursor, plain wheel pans.

## Change history

### 2026-06-13 — Replace tidy-tree with nested-outline hierarchical view
- **Motivation**: The ported canvas defaulted to a top-down tidy-tree *diagram*,
  which is not how Curve's canvas works — Curve's default is a nested outline
  (the "层级视图"). The user flagged the tree default as wrong.
- **Goal**: Default the canvas to Curve's hierarchical nested-outline layout
  while keeping the pan/zoom board interaction.
- **Key decision**: Render structure from `parentId`/`order` in document flow
  (banner + recursive `NodeBranch` with a `.rc-rail`), dropping the absolute
  positioning, the SVG edge layer, and the `layout.ts` tidy-tree entirely.

### 2026-06-13 — Created
- **Motivation**: Reproduce Curve's canvas interaction (comfortable-scale entry,
  pan/zoom) in a compact component on NanoBee's white surface.
- **Goal**: A self-contained viewport driven entirely by store state.
- **Key decision**: Local transform state + pointer/wheel handlers instead of a
  canvas library.
