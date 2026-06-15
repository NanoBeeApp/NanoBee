# src/components/compare/CompareColumn.tsx

## Responsibility
Pure-presentation single compare column: head (model picker + remove), scrollable
body (markdown answer / loading / error / empty), foot (elapsed + copy/regenerate
or a streaming hint).

## Props
`{ column, canDelete, canRun, onChangeModel, onRemove, onRetry, onCopy,
onConfigureKey, bodyRef?, onBodyScroll? }`. State comes from the store via `column`.

## States rendered
- `idle` → empty hint; `pending` → thinking dots; `streaming`/`done` → `<Markdown>`
  (streaming flag while live); `error` → light error block (`no_key` shows a
  "去配置 Key" action, otherwise a "重试" action).

## Relationships
- Upstream: `common/Markdown`, `icons/icons`, `CompareModelSelect`,
  `lib/compare-models` (`modelLabel`), store types (`CompareColumn`).
- Used by: `CompareView`. `bodyRef`/`onBodyScroll` let the view drive sync-scroll.

## Notes
- Matches the V2 design: light `danger-soft` error block (no heavy red border),
  secondary retry button (not a filled primary), no duplicate retry control.
- Delete (✕) only renders when `canDelete` (≥ 3 columns) — enforces "at least 2".

## Change history
### 2026-06-15 — Created
- Reason: the compare grid needs a reusable, state-driven column renderer.
- Goal: faithful V2 column (head/body/foot) with all status states.

### 2026-06-15 — Simplification
- Reason: user asked to reduce on-screen elements.
- Change: dropped the per-column idle hint ("输入下方问题…") — the centered
  empty-state guide in CompareView is the single prompt cue now, so the column
  body stays empty until a run starts.

### 2026-06-15 — English-only strings
- Reason: public-repo rule — all UI copy must be in English.
- Change: replaced all Chinese UI strings ("正在思考…", "需要配置 API Key",
  "请求失败", "重试", "复制", "重生成", "移除该模型", etc.) with English equivalents.
