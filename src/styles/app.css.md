# styles/app.css

## Responsibility
App-shell styles: sidebar, nav lists, outline tree, floating chrome, and
shared empty-state copy. Research-canvas layout tokens live here when they
belong to the left rail rather than the canvas surface (`research.css`).

## Implementation notes
- `.nb-side-empty` is the shared empty line for every per-page sidebar list.
- `.nb-outline-retry` is the in-place retry control shown in the research
  directory when outline generation failed (content-sized, ≥12px, no float).

## Verification
- Open a research project whose outline failed: the left rail shows
  "大纲生成失败" and a "重新生成" button instead of "大纲生成中…".

## Change history

### 2026-08-28 — Sidebar outline retry
- **Motivation**: a failed outline left the rail stuck on "大纲生成中…".
- **Goal**: an in-place retry button matching the canvas retry card.
- **Key decision**: content-sized `.nb-outline-retry` under `.nb-side-empty`,
  not a floating pill.

### 2026-08-28 — First sibling doc
- **Motivation**: coding rules require a sibling `.md` for `app.css`; the
  retry control is the first change that needed it recorded.
