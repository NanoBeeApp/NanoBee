# TaskTemplateModal.tsx

Modal dialog implementing the Task Template Library, opened from the "从模板开始" link on TasksHome.

## Purpose

- Renders a category tab strip + a flat template card list.
- Clicking a card enters a detail/confirm view with an optional mini param-fill form (e.g. threshold, UTC hour).
- "创建任务" calls `store.createTask` (optimistic, persists via `POST /api/tasks` with the resolved `triggerSpec`).
- Pressing Escape from detail goes back to the list; from the list, closes the modal.
- `comingSoon` templates are rendered disabled with an "即将上线" badge.

## URL state

The parent (`TasksView`) reads `url.tplCategory` from `useTasksUrl`. Opening the modal sets `?tpl=<categoryId>`; closing clears it.

## Design

Reuses the existing `nb-tk-modal-scrim` / `nb-tk-modal` chrome from `TaskUploadDialog`. New classes are prefixed `nb-tpl-*` and defined in `src/styles/tasks.css`.

## Change history

| Date       | Change |
|------------|--------|
| 2026-06-15 | Initial implementation with browse + detail views and param form. |
