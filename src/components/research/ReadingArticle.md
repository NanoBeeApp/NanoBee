# components/research/ReadingArticle.tsx

## File responsibility
The reading article body plus two always-on in-text interactions, ported from
Curve's `ReadingContent` and adapted to NanoBee's shared `<Markdown>` renderer:
clickable auto-term anchors (deep-dive) and a text-selection bubble (highlight /
research deeper). Owns saved-highlight re-application.

## Core exports / API
- `ReadingArticle({ content, nodeId, projectId, tags, streaming, onDeepDive, onOpenImage })`
  - `onDeepDive(term, focusParagraph?)` — grow a child around the term/selection,
    with the enclosing paragraph as context.

## Dependencies
- Upstream: `common/Markdown.tsx`, `./auto-term`, `./reading-highlights`.
- Downstream: `components/research/ReadingOverlay.tsx` (keys it by node id).

## Key implementation notes
- **React-safety**: the `<Markdown>` element is memoized (`useMemo` on
  content/streaming/onOpenImage) so this component re-rendering (selection /
  highlight state) never re-reconciles the markdown subtree, which would fight
  the manual DOM decorations. Decoration runs only on STABLE (non-streaming)
  content in `useLayoutEffect`; the parent keys this component by node id so
  node switches fully remount it.
- **Auto-terms**: `applyDecorations` wraps candidate phrases (AI bold, 《...》,
  「...」, tags) in `.rc-autoterm` spans and saved highlights in `<mark>`.
  Deep-dive clicks are caught by container delegation (`.rc-autoterm`), skipped
  while a selection is active so the bubble wins.
- **Selection bubble**: on mouseup, a non-collapsed selection inside the article
  shows the bubble; the enclosing paragraph is captured then (before a button
  press clears the selection). `onMouseDown preventDefault` keeps the selection
  alive while clicking a bubble button.

## Change history

### 2026-06-14 — Created (Phase B port)
- **Motivation**: NanoBee only made literal `**bold**` clickable and had no
  selection bubble / highlights; Curve's reading body was far richer.
- **Goal**: restore broader auto-terms, the selection bubble, highlight
  persistence, and paragraph-grounded deep dives — without re-introducing the
  React-vs-manual-DOM reconciliation bugs Curve warns about.
- **Key decision**: route ALL deep-dive clicks through DOM `.rc-autoterm`
  decoration (uniform, paragraph-aware) instead of the React bold-button path,
  and memoize the markdown element so decorations survive re-renders.
