# components/research/ResearchNodeCard.tsx

## File responsibility
Presentational card for one knowledge node in the outline (title / brief);
laid out in normal flow by the parent canvas.

## Core exports / API
- `ResearchNodeCard({ node, active, onOpen })`.

## Dependencies
- Upstream: `research/types.ts`.
- Downstream: `components/research/ResearchCanvas.tsx`.

## Key implementation notes
- Pure component: it never positions itself — the canvas nests cards under a
  vertical rail and the card fills its column.
- Title + brief carry the content; the whole card is one clickable button, so
  no per-card "click to read" CTA or expand/expanded status text is shown. Only
  the root keeps a "研究方向" kind badge; a spinner shows while loading and a
  failed state on error. `depth-N` drives subtle per-level styling.

## Change history

### 2026-06-14 — Strip redundant chrome to reduce visual noise
- **Motivation**: The "待展开/已展开" status badge and the "点击阅读/继续阅读"
  footer CTA (with book icon) restated what the clickable card already conveys —
  pure distraction.
- **Goal**: Keep only content-bearing elements per the "极简优先 · 禁止多余干扰
  元素" rule.
- **Key decision**: Removed the non-root kind badge and the whole `rc-node-foot`
  footer (and the now-unused `Icons` import); the card head now renders only for
  the root badge or the loading spinner.

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
