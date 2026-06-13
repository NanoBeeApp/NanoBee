# components/research/ResearchNodeCard.tsx

## File responsibility
Presentational card for one knowledge node in the outline (title / brief /
status / kind badge); laid out in normal flow by the parent canvas.

## Core exports / API
- `ResearchNodeCard({ node, active, onOpen })`.

## Dependencies
- Upstream: `icons/icons.tsx`, `research/types.ts`.
- Downstream: `components/research/ResearchCanvas.tsx`.

## Key implementation notes
- Pure component: it never positions itself — the canvas nests cards under a
  vertical rail and the card fills its column.
- Status reflected via "研究方向 / 待展开 / 已展开" badges, a spinner while
  loading, and a failed state. `depth-N` drives subtle per-level styling.

## Change history

### 2026-06-13 — Flow layout for the nested-outline canvas
- **Motivation**: The canvas moved from an absolute tidy-tree to a nested
  outline, so cards must lay out in document flow.
- **Goal**: Drop self-positioning so the outline rail controls placement.
- **Key decision**: Removed the `left/top/width` inline style and the `NODE_W`
  import; width now comes from CSS (`.rc-node { width: 100% }`).

### 2026-06-13 — Created
- **Motivation**: Render nodes in NanoBee's white card style (not Curve's sketch
  theme) while keeping the canvas controller simple.
- **Goal**: A stateless card the canvas can place and the store can drive.
- **Key decision**: All state lives in the store; the card only renders + emits
  `onOpen`.
