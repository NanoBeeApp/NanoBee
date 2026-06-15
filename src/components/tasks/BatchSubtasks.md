# BatchSubtasks.tsx

## Responsibility
The expanded child rows under a batch task: one line per input with its status
dot, input label, a short result / failure reason, and a Retry button on failed
rows. Read-only view of the batch surface.

## Dependencies
- Upstream: `src/types.ts` (`TaskBatch`, `SubTaskStatus`)
- Downstream: TaskRow

## Key implementation notes
- The real per-row execution pipeline (scheduling, concurrency, retries) is a later backend concern; this renders the batch data only.

## Change history

### 2026-06-15 — Created
- **Motivation**: A batch task ("100 companies · funding monitor") needs to expand into its child runs with per-row status and retry on failures.
- **Goal**: Render `task.batch.subtasks` as a compact, scannable child list.
