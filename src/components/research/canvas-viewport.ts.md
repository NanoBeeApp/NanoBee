# components/research/canvas-viewport.ts

## File responsibility
Per-topic canvas viewport memory: persist and restore each research project's
(topic's) canvas pan + zoom (`{ tx, ty, scale }`) separately, so switching
topics — and reloading the page — lands where the user left that topic's canvas
instead of re-centering.

## Core exports / API
- `interface CanvasViewport { tx: number; ty: number; scale: number }`
- `loadViewport(projectId): CanvasViewport | null` — the topic's saved pan/zoom,
  or null if never saved / stored value is invalid.
- `saveViewport(projectId, viewport): void` — remember a topic's pan/zoom
  (debounced by the caller); re-inserts the key as most-recently-used.

## Dependencies
- Upstream: browser `localStorage` only (no React, no Node, no Cloudflare).
- Downstream: `components/research/ResearchCanvas.tsx`.

## Key implementation notes
- Storage: a single `localStorage` key (`nanobee.research.viewports`) holding a
  `Record<projectId, CanvasViewport>`. Capped at `MAX_ENTRIES` (60) with an
  insertion-order LRU (project ids are non-integer string keys, so JS preserves
  insertion order; `saveViewport` deletes-then-reinserts to mark most-recent).
- **Why localStorage, not the D1 snapshot or the URL**: the pan offset is in
  screen pixels relative to the viewport width — per-device view state with no
  business syncing across devices/screen sizes — and it changes on every
  pan/wheel frame, far too hot for the server snapshot. Keeping it in
  browser-native storage also leaves the agent/runtime core untouched
  (see CLAUDE.md runtime principles): nothing here assumes Node or a filesystem.
- Every access is guarded (`safeStorage`, try/catch, `isViewport` validation) so
  it degrades to a no-op when storage is unavailable (privacy mode, SSR) or the
  stored JSON is corrupt — viewport memory is strictly best-effort.

## Change history

### 2026-06-14 — Created
- **Motivation**: the user wanted each research topic's canvas scroll position
  and zoom saved separately, so moving between topics restores each one's view.
- **Goal**: a small, dependency-free helper to persist/restore per-topic pan+zoom
  that works in the browser (the primary runtime) and survives a reload.
- **Key decision**: localStorage keyed by `projectId` (per-device, lightweight)
  rather than the D1 snapshot or URL params; validate + LRU-cap on read/write so
  the store can't grow unbounded or be poisoned by bad data.
