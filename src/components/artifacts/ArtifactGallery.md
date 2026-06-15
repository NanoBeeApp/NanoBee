# components/artifacts/ArtifactGallery.tsx

## Responsibility
Content area below the tab bar. Decides what to display based on the active tab: `mine` = your decks (empty → empty state + "Recommended for you"); `favorites` = favorited decks (empty → empty state + recommendations); category tab = one-click generation templates for that category. Owns the store wiring (open / favorite / delete / generate); `ArtifactCard` / `RecommendedCard` stay pure-render.

## Core exports / API
- `ArtifactGallery({ tab, viewMode, onViewModeChange })`

## Dependencies
- Upstream: `store/useAppStore.ts` (`artifacts` / `artifactGenerating` / `selectArtifact` / `toggleFavorite` / `deleteArtifact` / `runArtifactShortcut`), `artifacts/recommended.ts`, `artifacts/format.ts`, `ArtifactRow` / `ArtifactCard`, `RecommendedRow` / `RecommendedCard`, `ArtifactsViewSwitch`, `icons/icons.tsx`
- Downstream: `ArtifactsView.tsx`

## Key implementation notes
- `isCategory` determines whether the active tab is a category; category → templates; `mine` / `favorites` → owned decks or empty state + recommendations
- **Dispatches by `viewMode`**: `renderOwned` / `renderTemplates` each support `list` (default, `Row` components) / `table` (inline `<table>`) / `card` (`Card` components); table rows wire directly to store actions
- When a switchable list is present (category has templates, or owned list is non-empty) renders `ArtifactsViewSwitch` aligned to the top-right; pure empty state hides the switch
- The empty-state "Recommended for you · Popular" section uses `recommendedForYou()` (first item per category, ensuring variety)
- Favorites are filtered directly with `artifacts.filter(a => a.favorited)` — the data layer returns the `favorited` flag in a single pass

## Change history

### 2026-06-15 — List / table / card three-view dispatch
- **Motivation**: users found cards ugly; requested a non-card default and view switching between list / table / card
- **Goal**: gallery renders three views based on `viewMode`, supported for both owned and recommended items
- **Key decisions**: default `list` (lightweight flat rows, not cards); `table` uses an inline `<table>` (rows are simple, no separate component needed); `card` retained; view-switch control only shown when there is a switchable list; table rows wire directly to store actions

### 2026-06-15 — Created
- **Motivation**: the tabs refactor needed a content area that switches by tab; empty state should show recommendations / popular items
- **Goal**: three content types (mine / favorites / category) + empty-state recommendations
- **Key decisions**: container owns the store wiring, cards stay pure-render; recommendations reuse the shortcut generation pipeline; empty state uses cross-category recommendations to ensure variety
