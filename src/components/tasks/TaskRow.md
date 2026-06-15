# TaskRow.tsx

## Responsibility
One task row in the manager list view: status dot + title + type badge, a
trigger/topic subline, a "最近" result subline, the next-run/status on the right,
an enable toggle, and — for batch tasks — a progress bar plus an expander
revealing the child subtasks. Clicking the row body opens the detail drawer.

## Dependencies
- Upstream: TaskStatusDot, TaskTypeBadge, BatchSubtasks, `taskMeta` (`statusLabel`, `taskKind`), `data/topics` (`TOPICS`), `Icons`
- Downstream: TaskListView

## Change history

### 2026-06-15 — Created
- **Motivation**: The manager list needs a dense but flat row (no per-row card) that also handles batch progress + expansion.
- **Goal**: A self-contained row with toggle, batch progress and subtask expansion, opening the drawer on body click.
