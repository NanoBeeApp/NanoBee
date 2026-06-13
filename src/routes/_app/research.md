# _app/research.tsx

## Responsibility
Route `/research` — renders the research canvas (`ResearchView`) into the `_app`
layout outlet.

## Core exports
- `Route` — `createFileRoute("/_app/research")` with `component: ResearchView`.

## Dependencies
- Upstream: `@tanstack/react-router`, `@/components/research/ResearchView`.
- Downstream: none.

## Change history

### 2026-06-13 — created
- **Motivation**: give the research view its own URL (`/research`); previously
  it was reached only via the zustand `view` flag on the single `/` route.
- **Goal**: deep-linkable, back/forward-friendly navigation per view.
