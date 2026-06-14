# _app/research.tsx

## Responsibility
Route `/research` — renders the research canvas (`ResearchView`) into the `_app`
layout outlet.

## Core exports
- `Route` — `createFileRoute("/_app/research")` with `component: ResearchView`
  and a `validateSearch` that types the bookmarkable state.
- `ResearchSearch` — `{ project?: string; node?: string }` search-param shape
  (open project id + open reading-overlay node id).

## Dependencies
- Upstream: `@tanstack/react-router`, `@/components/research/ResearchView`.
- Downstream: `components/research/useResearchUrlSync.ts` reads these search
  params via `getRouteApi("/_app/research").useSearch()`.

## Change history

### 2026-06-14 — Add ?project=&node= search params
- **Motivation**: the open project and the open reading-overlay node lived only
  in the zustand store, so a refresh dropped them and the URL couldn't be
  bookmarked/shared (URL-as-state rule).
- **Goal**: make "which project + which article is open" a validated, typed,
  bookmarkable part of the URL.
- **Key decision**: `validateSearch` coerces/strips to `{ project?, node? }`;
  the two-way sync with the store lives in `useResearchUrlSync` (kept out of the
  thin route file).

### 2026-06-13 — created
- **Motivation**: give the research view its own URL (`/research`); previously
  it was reached only via the zustand `view` flag on the single `/` route.
- **Goal**: deep-linkable, back/forward-friendly navigation per view.
