# components/artifacts/ArtifactsView.tsx

## Responsibility
Orchestrator for the Artifacts page. Top tab bar (Your creations / Your favorites + categories), content area is a per-tab browsable gallery; selecting a deck switches to the detail view. Responsible only for URL ↔ store sync and the "gallery vs. detail" toggle — concrete UI is delegated to `ArtifactsTabs` / `ArtifactGallery` / `ArtifactDetail`. This page triggers generation but does not own generation logic.

## Core exports / API
- `ArtifactsView()`

## Dependencies
- Upstream: `useArtifactsUrlSync` (URL sync for active tab + selected deck), `store/useAppStore.ts` (`artifacts` / `selectedArtifactId` / `loadArtifacts`), child components `ArtifactsTabs` / `ArtifactGallery` / `ArtifactDetail`
- Downstream: route `routes/_app/artifacts.tsx`

## Key implementation notes
- On first mount a `useEffect` calls `loadArtifacts` to ensure freshly generated artifacts appear in the list
- If `selectedId` matches a loaded artifact → renders `ArtifactDetail` (tabs hidden, deck fills the surface); otherwise renders tabs + gallery
- Tab state is stored only in the URL (`?tab=`); selected deck is stored in the URL (`?artifact=`) and mirrored in the store for sidebar highlighting

## Change history

### 2026-06-15 — View mode (list / table / card)
- **Motivation**: users found cards ugly; requested a non-card default with view switching
- **Goal**: pass `viewMode` / `setViewMode` from `useArtifactsUrlSync` down to `ArtifactGallery`
- **Key decisions**: orchestrator passes only two additional props; view-switch control and all three view renderings live inside the gallery

### 2026-06-15 — Top tabs + browsable gallery
- **Motivation**: users asked for tabs at the top of the artifacts page (`你创建的` / `你收藏的` / categories); new users default to the "Your creations" empty state with recommendations / popular items at the bottom
- **Goal**: convert the detail-only page into a per-tab browsable gallery; empty state includes "Recommended for you"; category tabs show one-click generation templates
- **Key decisions**: this component is demoted to orchestrator; UI split into Tabs / Gallery / Detail / cards; both tab and selected deck go into the URL (URL is state); `loadArtifacts` no longer auto-selects the newest artifact — defaults to landing on the gallery

### 2026-06-13 — Quick-generate entry points + generating state
- **Motivation**: users wanted "quick shortcuts, click and run" — no typing required
- **Goal**: add an `ArtifactShortcuts` chip row at the top of the detail area; clicking a chip triggers generation; display an `nb-arti-generating` banner during generation; update empty-state copy to guide users toward shortcuts
- **Key decisions**: this page still does not own generation logic; clicks go through `store.runArtifactShortcut` (via the chat pipeline + agent tools); the page only triggers and displays

### 2026-06-13 — detail-only (deck list moved to the sidebar)
- **Motivation**: the user asked that the Artifacts page's list live in the
  sidebar like every other page, so the in-page master list was now duplicate
  chrome.
- **Goal**: remove the left `nb-arti-list` column and let the selected deck fill
  the whole center surface (maximize content area).
- **Key decision**: kept the detail markup (`nb-arti-detail` is now the root,
  centered via `margin:auto`); the deck list lives in the new `ArtifactsNavList`
  sidebar component, which drives `selectArtifact`.

### 2026-06-13 — Created
- **Motivation**: users requested a dedicated artifacts page to collect card data generated from chat
- **Goal**: master/detail page that lists and renders artifact decks
- **Key decisions**: page is read-only, does not generate; reuses the card renderer; white background, left list + right detail to maximize the content area
