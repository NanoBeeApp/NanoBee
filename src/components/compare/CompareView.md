# src/components/compare/CompareView.tsx

## Responsibility
The `/compare` route's content (inside the app shell): toolbar (add model /
regenerate all / sync-scroll / share), the horizontal column grid, the shared
bottom composer, the empty-state guidance, and the provider-key dialog.

## Relationships
- Upstream: `useCompareStore` (all state + actions), `useAppStore` (`toast`),
  `useCompareUrlSync` (URL sync), `lib/compare-models` (column bounds),
  `icons/icons`.
- Children: `CompareColumn`, `CompareComposer`, `ProviderKeyDialog`.
- Rendered by: `routes/_app/compare.tsx`.

## Key implementation notes
- Calls `useCompareUrlSync()` once at the top, and loads the provider catalog once.
- Sync-scroll mirrors one column's scroll ratio onto the others via a `bodyRefs`
  map + a `syncing` guard ref (prevents the mirrored writes from re-triggering).
- Share copies the current URL (the model set + initial prompt live in it).
- Empty state (no prompt yet) is a flat centered guide (no card), per V2.

## Change history
### 2026-06-15 — Created
- Reason: top-level container wiring the compare store to the URL, sync-scroll,
  clipboard, and the column/composer/dialog children.
- Goal: faithful V2 layout with all toolbar actions and empty/loading/error flows.

### 2026-06-15 — Second-level page + simplification
- Reason: per user, compare must be a SECOND-LEVEL page inside the chat page (not
  a separate route), and the UI had too many dividers / elements.
- Changes: added a "返回聊天" back button (navigates `/` clearing compare search);
  removed the title subtitle; removed the full-width ghost "add model" column
  (add-model now only the toolbar button, so it no longer eats horizontal space).
- Key decision: keep only the single inter-column divider; the toolbar/column-head/
  composer dividers were dropped (handled in compare.css) for a cleaner surface.

### 2026-06-15 — Wiring + English-only strings
- Reason: public-repo rule requires all UI copy in English; added `syncView('compare')`
  on mount so the sidebar Compare tile highlights correctly while the page is active.
- Changes: all Chinese strings replaced with English equivalents; added a
  `useEffect` that calls `syncView('compare')` on mount and resets to `'chat'` on
  unmount; back-button navigates to `{ to: '/', search: {} }` (clears all compare
  params cleanly); `Rendered by` note updated to reflect it's a sub-view of
  `routes/_app/index.tsx` not a separate route.
