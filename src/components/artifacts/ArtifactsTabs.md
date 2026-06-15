# components/artifacts/ArtifactsTabs.tsx

## Responsibility
Pure-render component for the tab bar at the top of the Artifacts page: two fixed personal tabs (`你创建的` (Your creations) / `你收藏的` (Your favorites)) plus category tabs (Finance / Tech / Developer …).

## Core exports / API
- `ArtifactsTabs({ activeTab, onSelect })`

## Dependencies
- Upstream: `artifacts/recommended.ts` (`ARTIFACT_CATEGORIES`), `icons/icons.tsx`
- Downstream: `ArtifactsView.tsx`

## Key implementation notes
- Pure rendering; active state and the select callback come from the parent (via `useArtifactsUrlSync`); tab values are the URL `tab` parameter
- Personal tabs and category tabs are separated by a blank gap (no hard divider line — follows the "reduce border emphasis" rule)
- Each tab carries `role` / `aria-selected` and `data-testid`

## Change history

### 2026-06-15 — Created
- **Motivation**: the artifacts page needed a top tab bar
- **Goal**: pure-render bar with personal tabs + category tabs
- **Key decisions**: categories sourced from the `recommended` module; pure rendering makes it easy to test; gap instead of divider
