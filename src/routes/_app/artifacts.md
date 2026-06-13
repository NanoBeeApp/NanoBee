# _app/artifacts.tsx

## Responsibility
Route `/artifacts` — renders the card-deck gallery (`ArtifactsView`) into the
`_app` layout outlet.

## Core exports
- `Route` — `createFileRoute("/_app/artifacts")` with `component: ArtifactsView`.

## Dependencies
- Upstream: `@tanstack/react-router`, `@/components/artifacts/ArtifactsView`.
- Downstream: none.

## Key notes
- `ArtifactsView` loads the deck list on mount, so deep-linking `/artifacts`
  populates correctly without going through the `openArtifacts` store action.

## Change history

### 2026-06-13 — created
- **Motivation**: give the artifacts view its own URL (`/artifacts`); previously
  it was reached only via the zustand `view` flag on the single `/` route.
- **Goal**: deep-linkable, back/forward-friendly navigation per view.
