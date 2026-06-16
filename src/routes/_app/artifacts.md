# _app/artifacts.tsx

## Responsibility
Route `/artifacts` — renders the card-deck gallery (`ArtifactsView`) into the
`_app` layout outlet.

## Core exports
- `Route` — `createFileRoute("/_app/artifacts")` with `validateSearch` for
  `{ tab?, artifact?, vm? }` and `component: ArtifactsView`.
- `ArtifactsSearch` — the search-param shape (`tab`, `artifact`, `vm`).
- `ArtifactsViewMode` — `'list' | 'table' | 'card'` (the gallery view mode).

## Dependencies
- Upstream: `@tanstack/react-router`, `@/components/artifacts/ArtifactsView`.
- Downstream: `useArtifactsUrlSync` reads this route's search via `getRouteApi`.

## Key notes
- `ArtifactsView` loads the deck list on mount, so deep-linking `/artifacts`
  populates correctly without going through the `openArtifacts` store action.
- Search params are the bookmarkable source of truth: `tab` (mine | favorites |
  category id), `artifact` (open deck id) and `vm` (list | table | card). Empty /
  invalid values normalize to `undefined` so the defaults keep the URL clean.

## Change history

### 2026-06-15 — vm (view mode) search param
- **Motivation**: the gallery gained a list / table / card view switch; the
  chosen view is view state that must survive refresh and be shareable.
- **Goal**: add `vm` to the search schema (default `list`, omitted when default).
- **Key decision**: `validateSearch` accepts only `list | table | card`;
  `useArtifactsUrlSync` exposes `viewMode` / `setViewMode`.

### 2026-06-15 — tab + open-deck search params
- **Motivation**: the page gained top tabs and an inline deck detail; both are
  view state that must survive refresh and be shareable (URL-as-state rule).
- **Goal**: encode the active tab and the open artifact in the URL.
- **Key decision**: `validateSearch` normalizes to `{ tab?, artifact? }`; the
  two-way sync lives in `useArtifactsUrlSync`.

### 2026-06-13 — created
- **Motivation**: give the artifacts view its own URL (`/artifacts`); previously
  it was reached only via the zustand `view` flag on the single `/` route.
- **Goal**: deep-linkable, back/forward-friendly navigation per view.
### 2026-06-15 — added errorComponent
- **Motivation**: per-route error isolation via RouteErrorFallback.

