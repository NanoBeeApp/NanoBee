# components/research/layout.ts

## File responsibility
Pure tidy-tree layout: assigns each node an (x, y) so the tree reads top-down,
parents centered over their children.

## Core exports / API
- `NODE_W`, `NODE_H` constants.
- `layoutNodes(nodes, order)` → `{ id: {x, y} }`.

## Dependencies
- Upstream: `research/types.ts`.
- Downstream: `store/useResearchStore.ts`, `components/research/ResearchCanvas.tsx`.

## Key implementation notes
- Leaves get sequential x slots; internal nodes center over their children.
  Depth maps to y. Child order follows the snapshot `order` array for stability.
- The store calls this whenever the node set changes and writes coordinates back
  onto the nodes, so a reloaded snapshot restores the same layout.

## Change history

### 2026-06-13 — Created
- **Motivation**: The canvas needs deterministic node positions reproducing
  Curve's top-down outline framing without its 4000-line canvas controller.
- **Goal**: A small pure function the store and canvas share.
- **Key decision**: Classic tidy-tree (leaf slotting + parent centering) over a
  force layout — predictable, cheap, and snapshot-stable.
