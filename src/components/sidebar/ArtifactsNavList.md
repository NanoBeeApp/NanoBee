# src/components/sidebar/ArtifactsNavList.tsx

## Responsibility
The sidebar scroll-area list shown while the app is on the Artifacts page. Lists
every card deck the AI generated from chat. Clicking one selects the deck shown
on the (now full-width) Artifacts detail surface. This is the page's master
list — `ArtifactsView` itself is detail-only.

## Core export / API
- `ArtifactsNavList()` — self-contained; reads `artifacts`,
  `selectedArtifactId`, `artifactsLoading`, `selectArtifact` from `useAppStore`.

## Dependencies
- Upstream: `useAppStore`, icons
- Downstream: `Sidebar` (rendered when `view === 'artifacts'`)

## Key implementation notes
- The active row tracks `selectedArtifactId`; clicking calls `selectArtifact`.
- Shows "加载中…" / "还没有生成卡片" empty states based on `artifactsLoading`.

## Change history

### 2026-06-13 — created
- **Motivation**: the user asked that each page's sidebar list be the
  corresponding list; the Artifacts deck list belonged in the sidebar rather
  than duplicated inside the page.
- **Goal**: make the sidebar the single master list of decks, freeing the
  Artifacts page to render the selected deck full-width.
- **Key decision**: moved the deck list out of `ArtifactsView` (which became
  detail-only) into this sidebar component to maximize the content area.
