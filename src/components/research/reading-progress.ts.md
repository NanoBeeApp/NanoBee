# components/research/reading-progress.ts

## File responsibility
Per-node reading scroll-position memory for the reading overlay. Persists the
overlay's `scrollTop` keyed by `projectId + nodeId` so reopening a node returns
the reader to where they left off. Browser-local (`localStorage`) only.

## Core exports / API
- `loadReadingProgress(projectId, nodeId): number` — saved scrollTop (0 if none).
- `saveReadingProgress(projectId, nodeId, scrollTop)` — write (deletes the entry
  when scrollTop ≤ 0); soft-LRU caps the map at 200 entries.

## Dependencies
- Upstream: none (pure localStorage util).
- Downstream: `components/research/ReadingOverlay.tsx`.

## Key implementation notes
- Ported from Curve's `reading-progress.ts`, trimmed to NanoBee's single-string
  `node.content` model. Same storage shape (`{scrollTop, updatedAt}` map) but a
  NanoBee-namespaced key.
- All reads/writes are try/caught so a full/disabled localStorage never breaks
  the reading flow.

## Change history

### 2026-06-14 — Created
- **Motivation**: the Curve→NanoBee port dropped per-node scroll memory, so
  every reopen jumped back to the top of a long article.
- **Goal**: restore "reopen a node → land where I left off".
- **Key decision**: keep it a standalone localStorage util (not store state) so
  it stays browser-local and out of the persisted D1 snapshot.
