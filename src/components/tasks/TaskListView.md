# TaskListView.tsx

## Responsibility
Manager list view: flat task rows (Twitter-feed style, hairline separators, no
per-row cards). Also exports `TasksEmpty`, the shared empty state used by every
view.

## Core exports
- `TaskListView` — the list
- `TasksEmpty` — shared empty-state nudge

## Dependencies
- Upstream: TaskRow, `src/types.ts` (`Task`)
- Downstream: AllTasksView (and TaskTableView / TaskBoardView import `TasksEmpty`)

## Change history

### 2026-06-15 — Created
- **Motivation**: The default manager view should be a quiet flat list, with a consistent empty state across all views.
- **Goal**: Render rows or the shared empty nudge.
