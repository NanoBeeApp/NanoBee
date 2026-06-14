# components/research/useResearchUrlSync.ts

## File responsibility
Two-way bridge between the research URL search params (`?project=&node=`) and the
research store, so the open project + open reading overlay survive a refresh and
are bookmarkable / shareable.

## Core exports / API
- `useResearchUrlSync(): void` — call once inside the `/research` route subtree
  (ResearchView). No return value; runs two effects.

## Dependencies
- Upstream: `@tanstack/react-router` (`getRouteApi("/_app/research").useSearch`,
  `useNavigate`), `store/useResearchStore.ts` (`projectId`, `activeNodeId`,
  `loadProject`, `openNode`, `closeReading`).
- Downstream: mounted by `components/research/ResearchView.tsx`.

## Key implementation notes
- **URL → store**: a different `project` in the URL → `loadProject(project, node)`
  (loads the snapshot and opens the deep-linked node in one set); same project,
  changed `node` → `openNode` / `closeReading`. This drives deep-links, refresh,
  and browser back/forward.
- **store → URL**: reflects user-driven store changes back into the search params
  via `navigate({ to: "/research", search })`, only when they actually differ.
- **Loop / hydration safety**: both directions act only on a real difference, so
  they converge. The store→URL effect keeps the previous `projectId` in a ref to
  distinguish an *initial* null (store not yet hydrated from a deep link — leave
  the URL alone for URL→store to load) from a null caused by the user resetting
  to the welcome screen (clear the URL). Without this, a deep-linked / refreshed
  `?project=…` would be wiped before it loads.

## Change history

### 2026-06-14 — Created
- **Motivation**: the research canvas put nothing about the open project or the
  open article modal into the URL — refresh dropped the reading overlay and the
  page couldn't be bookmarked or shared (the URL-as-state rule).
- **Goal**: make `?project=&node=` the bookmarkable source of truth and keep it
  in sync with the existing store-driven view (which must stay a writer because
  `growChild` mints node ids).
- **Key decision**: a small two-effect hook rather than rewriting the store to be
  URL-first; the ref-based guard is what makes deep-link hydration safe against
  the store→URL "clear on null" path.
