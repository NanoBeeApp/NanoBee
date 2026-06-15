# _app/tasks.tsx

## Responsibility
Route `/tasks` — renders the task center (`TasksView`) into the `_app` layout
outlet.

## Core exports
- `Route` — `createFileRoute("/_app/tasks")` with `component: TasksView`.

## Dependencies
- Upstream: `@tanstack/react-router`, `@/components/tasks/TasksView`.
- Downstream: none.

## Change history

### 2026-06-15 — Added `tpl` search param for the template picker
- **Motivation**: Task Template Library picker must be URL-addressable (bookmarkable open state + active category).
- **Change**: Added `tpl?: string` to `TasksSearch` and its corresponding `validateSearch` clause.

### 2026-06-15 — Added `validateSearch` for the redesigned Tasks page
- **Motivation**: The clean home / manager surfaces, view mode, open drawer, filter and upload dialog must all be bookmarkable per the "URL is state" rule.
- **Goal**: Make the page state URL-addressable.
- **Change**: Added `TasksSearch` / `TasksViewMode` / `TasksSurface` and a `validateSearch` parsing `view` / `vm` / `task` / `f` / `upload` (`upload=open`, a non-numeric token, keeps the URL clean). Consumed via `useTasksUrl`.

### 2026-06-13 — created
- **Motivation**: give the tasks view its own URL (`/tasks`); previously it was
  reached only via the zustand `view` flag on the single `/` route.
- **Goal**: deep-linkable, back/forward-friendly navigation per view.
