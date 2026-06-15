# _app/today.tsx

## Responsibility
Route `/today` — renders the Today reading surface (`TodayView`) into the
`_app` layout outlet.

## Core exports
- `Route` — `createFileRoute("/_app/today")` with `component: TodayView`.

## Dependencies
- Upstream: `@tanstack/react-router`, `@/components/today/TodayView`.
- Downstream: none.

## Change history

### 2026-06-13 — created
- **Motivation**: give the today view its own URL (`/today`); previously it was
  reached only via the zustand `view` flag on the single `/` route.
- **Goal**: deep-linkable, back/forward-friendly navigation per view.
