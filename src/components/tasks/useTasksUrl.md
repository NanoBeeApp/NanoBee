# useTasksUrl.ts

## Responsibility
Bridge between the Tasks page URL search params and the components. Exposes the
current surface (home vs the "all tasks" manager), view mode, open drawer id,
filter and upload-dialog flag, plus setters that navigate. The URL is the single
source of truth, so refresh / deep link / back-forward all restore the same state.

## Core exports
- `useTasksUrl() → TasksUrl` ({ surface, vm, taskId, filter, uploadOpen, tplCategory, openAll, openHome, setVm, openTask, closeTask, setFilter, openUpload, closeUpload, openTemplate, closeTemplate, setTplCategory })
- `DEFAULT_TASKS_VM`, `DEFAULT_TASKS_FILTER`, `DEFAULT_TEMPLATE_CATEGORY`

## Dependencies
- Upstream: `@tanstack/react-router` (`getRouteApi`, `useNavigate`), `routes/_app/tasks` (`TasksSearch`)
- Downstream: TasksView, AllTasksView, TasksHome (indirectly)

## Key implementation notes
- Tasks surface state is page-local (only changed from within this page), so a
  single URL source of truth suffices — no store round-trip or initial-hydration
  ref dance (contrast `useArtifactsUrlSync`, which reconciles a store selection
  set from outside the page).
- `mk()` drops params at their default to keep URLs short. The `upload` token is
  `'open'` (a non-numeric value) so the round-trip-safe serializer does not wrap
  it in quotes (`?upload=open`, not `?upload="1"`).

## Change history

### 2026-06-15 — Added template picker URL state
- **Motivation**: Task Template Library needs bookmarkable picker state (open + active category).
- **Change**: Added `tpl` search param (`TasksSearch`), `tplCategory`, `openTemplate`, `closeTemplate`, `setTplCategory` to `TasksUrl`.

### 2026-06-15 — Created
- **Motivation**: The redesign needs surface/view/drawer/filter/upload all bookmarkable per the "URL is state" rule.
- **Goal**: A small typed bridge over the route search params with clean URLs.
