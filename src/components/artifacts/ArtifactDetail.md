# components/artifacts/ArtifactDetail.tsx

## Responsibility
Detail view for a single open deck: an entry point to return to the gallery, the deck title with favorite / delete actions, and the deck rendered by the shared `CardDeckRenderer`. Rendered by `ArtifactsView` when an artifact is selected (URL `?artifact=`), hiding the tabs so the deck fills the entire surface.

## Core exports / API
- `ArtifactDetail({ artifact })`

## Dependencies
- Upstream: `store/useAppStore.ts` (`selectArtifact` / `deleteArtifact` / `toggleFavorite`), `artifacts/types.ts`, `icons/icons.tsx`, `components/cards/CardDeckRenderer.tsx`
- Downstream: `ArtifactsView.tsx`

## Key implementation notes
- Back = `selectArtifact(null)` → returns to gallery via URL sync
- Delete = `deleteArtifact(id)` followed by `selectArtifact(null)` to force a return to the gallery (rather than auto-advancing to another deck)
- Reuses `CardDeckRenderer` — zero duplicated rendering logic

## Change history

### 2026-06-15 — Created (extracted from the old `ArtifactsView`)
- **Motivation**: after the tabs refactor, the detail view became a sub-view of the gallery and needed its own focused component
- **Goal**: extract the old detail-only rendering into a standalone component with a back entry point
- **Key decisions**: force return to gallery after deletion; favorite / delete actions placed side-by-side to the right of the title, no extra toolbar row
