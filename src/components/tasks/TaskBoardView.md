# TaskBoardView.tsx

## Responsibility
Manager board view: tasks grouped into columns by execution state (运行中 / 已暂停
/ 异常 / 已完成). Light columns, gaps not rules. Each card is compact (dot + title +
badge + trigger). Empty columns show a pale placeholder rather than blank space.

## Dependencies
- Upstream: TaskTypeBadge, TaskStatusDot, `TasksEmpty`, `src/types.ts` (`Task`)
- Downstream: AllTasksView

## Change history

### 2026-06-15 — Created
- **Motivation**: A status-grouped board gives an at-a-glance health view for users who prefer columns.
- **Goal**: Group tasks into status columns with compact cards and non-empty empty columns.
