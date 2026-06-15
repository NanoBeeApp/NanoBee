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

### 2026-06-15 — richer empty state with template CTA
- **Motivation**: the old one-liner ("还没有符合条件的任务") dead-ended users with no clear path to creating their first task.
- **Goal**: inspire with a prominent "从模板开始" CTA and three example scenario chips that each open the template picker pre-filtered to their category.
- **Key decision**: `TasksEmpty` now accepts an `onTemplate(categoryId?)` callback; `TaskListView` forwards it, and `AllTasksView` supplies it via `url.openTemplate()`.
