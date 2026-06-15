# components/artifacts/ArtifactCard.tsx

## Responsibility
Pure rendering of a single "created artifact" card in the gallery grid. Clicking the card body opens the deck detail; the corner buttons favorite / delete without opening.

## Core exports / API
- `ArtifactCard({ artifact, onOpen, onToggleFavorite, onDelete })`

## Dependencies
- Upstream: `artifacts/types.ts` (Artifact), `icons/icons.tsx`
- Downstream: `ArtifactGallery.tsx`

## Key implementation notes
- Pure rendering — all actions are injected by the gallery
- The favorite star is always visible (reflects state); the delete button only appears on hover
- Corner buttons call `stopPropagation` to prevent bubbling up to the open handler; supports `Enter`/`Space` keyboard activation
- `data-testid` uses business semantics (`artifact-card-{id}` / `artifact-favorite-{id}` / `artifact-card-delete-{id}`)

## Change history

### 2026-06-15 — Switched to shared format + became one of the card views
- **Motivation**: artifacts gained list / table / card views; the card is now just one optional view; metadata formatting was moved down to `artifacts/format.ts`
- **Key decisions**: removed the local `KIND_LABEL` map, now calls `artifactMeta()`; card styles retained

### 2026-06-15 — Created
- **Motivation**: the `你创建的` (Your creations) / `你收藏的` (Your favorites) tabs needed grid cards
- **Goal**: pure-render card that can be clicked to open, favorited, and deleted
- **Key decisions**: pure rendering with injected actions; star always visible, delete only on hover — reduces visual noise at rest
