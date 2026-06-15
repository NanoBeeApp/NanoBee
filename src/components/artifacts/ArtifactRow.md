# components/artifacts/ArtifactRow.tsx

## Responsibility
A single row in the list view for a "created artifact" (your creations / your favorites). Twitter-feed-style flat row — no card border; rows are distinguished by a hairline divider and hover background rather than a box. Clicking the entire row opens the deck detail; tail buttons for favorite / delete do not trigger open. Pure rendering.

## Core exports / API
- `ArtifactRow({ artifact, onOpen, onToggleFavorite, onDelete })`

## Dependencies
- Upstream: `artifacts/types.ts`, `artifacts/format.ts` (`artifactMeta`), `icons/icons.tsx`
- Downstream: `ArtifactGallery.tsx` (list view)

## Key implementation notes
- Reuses `.nb-arti-card-fav` / `.nb-arti-card-del` button styles (delete only visible on hover)
- Favorite `testid` matches the card: `artifact-favorite-{id}` (only one view is rendered at a time, so no collision)

## Change history

### 2026-06-15 — Created
- **Motivation**: users found cards ugly; switched default to a lightweight flat list
- **Goal**: flat row with no card chrome
- **Key decisions**: hairline divider + hover background (follows the "list rows reference Twitter flat style, no per-item cards" rule)
