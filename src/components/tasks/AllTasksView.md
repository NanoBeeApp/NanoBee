# AllTasksView.tsx

## Responsibility
The secondary "all tasks" manager, reached from the home screen's "查看全部 →".
Where all management complexity lives — view switch, filters, search, table/board,
batch detail — kept off the clean home screen. Stateful wrapper: owns the search
text, reads view mode / filter from the URL, applies the kind filter + text
search, and renders the toolbar + the active view.

## Dependencies
- Upstream: `useAppStore` (`tasks`, `toggleTask`), `useTasksUrl` (`TasksUrl`), TasksToolbar, TaskListView, TaskTableView, TaskBoardView, `taskMeta` (`taskKind`)
- Downstream: TasksView

## Change history

### 2026-06-15 — Created
- **Motivation**: All the dashboard-style complexity needs a home that is one click away from the clean first screen.
- **Goal**: Orchestrate the toolbar + the active view with filter/search applied.

### 2026-06-15 — pass onTemplate to TaskListView for rich empty state
- **Motivation**: the rich TasksEmpty needs to open the template picker with a category pre-selected.
- **Change**: added `handleTemplate` that calls `url.openTemplate(cat)` and passes it down to `TaskListView`.
