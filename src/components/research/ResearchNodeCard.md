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
  the root keeps a `"研究方向"` ("Research direction") kind badge, and a failed
  state shows on error. Loading is intentionally silent — no per-card spinner.
  `depth-N` drives subtle per-level styling.

## Change history

### 2026-06-18 — Drop the per-card loading spinner
- **Motivation**: user asked to remove the spinning loading indicator on canvas
  cards — it added motion/noise while the outline was still streaming.
- **Goal**: keep cards quiet during generation; the card title already conveys
  the node, and the reading overlay keeps its own first-byte spinner.
- **Key decision**: removed the `loading` flag and the `rc-node-spinner` span;
  the card head now renders only for the root `"研究方向"` badge. The
  `.rc-node-spinner` CSS class stays (still used by `ReadingOverlay`).

### 2026-06-14 — All-white cards, no gray depth fill, no hover lift
- **Motivation**: user asked to drop the gray card backgrounds (depth-2/3 used
  `--surface-2`/`--surface-3`) and the hover shadow/border lift; the grays also
  conflicted with NanoBee's "white background, minimize card chrome" rule.
- **Goal**: keep cards white and quiet; convey nesting via indentation +
  connector rails + title-size step instead of background color.
- **Key decision**: in `research.css`, removed the `.rc-node.depth-2/-3`
  background overrides and the `.rc-node:hover` rule (active/root states keep
  their brand styling).

### 2026-06-14 — Strip redundant chrome to reduce visual noise
- **Motivation**: The `"待展开/已展开"` ("Pending/Expanded") status badge and the
  `"点击阅读/继续阅读"` ("Click to read / Continue reading") footer CTA (with book
  icon) restated what the clickable card already conveys — pure distraction.
- **Goal**: Keep only content-bearing elements per the "minimal-first, no
  gratuitous decorative elements" rule.
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
