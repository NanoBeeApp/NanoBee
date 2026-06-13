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

### 2026-06-13 — created
- **Motivation**: give the tasks view its own URL (`/tasks`); previously it was
  reached only via the zustand `view` flag on the single `/` route.
- **Goal**: deep-linkable, back/forward-friendly navigation per view.
