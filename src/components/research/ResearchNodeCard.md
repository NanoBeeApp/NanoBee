# components/research/ResearchNodeCard.tsx

## File responsibility
Presentational card for one knowledge node on the canvas (title / brief /
status / kind badge); absolutely positioned by the parent canvas.

## Core exports / API
- `ResearchNodeCard({ node, active, onOpen })`.

## Dependencies
- Upstream: `icons/icons.tsx`, `components/research/layout.ts` (NODE_W),
  `research/types.ts`.
- Downstream: `components/research/ResearchCanvas.tsx`.

## Key implementation notes
- Pure component: position comes from `node.x/node.y`, width from `NODE_W`.
- Status reflected via "研究方向 / 待展开 / 已展开" badges, a spinner while
  loading, and a failed state. Depth drives a class for subtle styling.

## Change history

### 2026-06-13 — Created
- **Motivation**: Render nodes in NanoBee's white card style (not Curve's sketch
  theme) while keeping the canvas controller simple.
- **Goal**: A stateless card the canvas can place and the store can drive.
- **Key decision**: All state lives in the store; the card only renders + emits
  `onOpen`.
