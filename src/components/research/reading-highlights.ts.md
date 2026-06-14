# components/research/reading-highlights.ts

## File responsibility
Per-node highlight persistence for the reading article. Stores the text phrases
the reader marked, keyed by `project + node`, so they re-appear (re-wrapped in
`<mark>`) on reopen. Browser-local (`localStorage`) only.

## Core exports / API
- `loadHighlights(projectId, nodeId): string[]`
- `saveHighlights(projectId, nodeId, texts)` — deletes the entry when empty;
  soft-LRU caps the map at 200 entries.

## Dependencies
- Upstream: none.
- Downstream: `components/research/ReadingArticle.tsx`.

## Key implementation notes
- Ported from the highlight half of Curve's `reading-interactions.ts`, with a
  NanoBee-namespaced storage key. All access is try/caught so a full/disabled
  localStorage never breaks reading.

## Change history

### 2026-06-14 — Created (Phase B port)
- **Motivation**: the port dropped reader highlights entirely.
- **Goal**: persist highlighted phrases per node so they survive reopen.
- **Key decision**: keep it a standalone localStorage util (browser-local), out
  of the persisted D1 snapshot — highlights are a personal reading aid.
