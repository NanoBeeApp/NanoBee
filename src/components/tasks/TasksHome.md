# TasksHome.tsx

## Responsibility
Clean single-focus first screen of the Tasks page: a quiet headline, the task
composer (the one visual focus), and a subordinate running overview. All
management complexity (view switch, filters, table/board, batch detail) lives one
click away in the manager — never on this screen.

## Dependencies
- Upstream: TaskComposer, TaskRunningOverview
- Downstream: TasksView

## Change history

### 2026-06-15 — Created
- **Motivation**: User feedback — the first screen must be clean, single-purpose, with one visual focus, not a dashboard listing all complexity.
- **Goal**: Compose the calm home surface (headline + composer + overview) and push everything else to a secondary surface.
