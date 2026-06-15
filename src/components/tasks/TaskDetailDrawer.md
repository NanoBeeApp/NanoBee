# TaskDetailDrawer.tsx

## Responsibility
Right-side detail drawer (`role=dialog`) for one task: header (title + status +
kind + topic), the trigger/action config rows, the run-history timeline, the
latest output, and the action bar (run once / pause-resume / edit / delete).
Opened via the URL `?task=id` so it survives refresh and deep links.

## Dependencies
- Upstream: `useAppStore` (`toggleTask`, `deleteTask`, `toast`), TaskTypeBadge, `taskMeta` (`statusLabel`, `statusTone`), `data/topics` (`TOPICS`), `Icons`, `src/types.ts` (`Task`)
- Downstream: TasksView

## Key implementation notes
- "Run once" and "edit" are stubbed to toasts (those backends are a later concern); pause and delete are wired to the real store actions.

## Change history

### 2026-06-15 — Live run history section
- **Motivation**: The static `task.history` array was empty for most real tasks;
  run history is now sourced from the `task_runs` D1 table.
- **Changes**: Replaced the static `{task.history.map(...)}` block with
  `<TaskRunHistory taskId={task.id} />`. The new component lazy-fetches
  `GET /api/tasks/:id/runs` when the drawer opens, shows status dots
  (ok/failed/skipped), relative timestamps, and plain-language error text.
  Import: `TaskRunHistory` from `./TaskRunHistory`.

### 2026-06-15 — Added BatchSubtasks panel for batch tasks
- **Motivation**: Batch tasks in the drawer had no way to see per-row progress or retry.
- **Changes**: Import `BatchSubtasks` and `taskKind`; added `isBatch` derived flag;
  show a "子任务进度" section with `<BatchSubtasks task={task} />` for batch tasks;
  hide "最近产出" for batch tasks (they use the subtask panel instead).

### 2026-06-15 — Wire: show last/next run times, triggerSpec, and add missing data-testid attributes
- **Motivation**: The drawer was missing key scheduling context (last run, next run, triggerSpec summary) and several interactive elements lacked `data-testid` attributes needed for testing.
- **Changes**:
  - Added a "计划与记录" section showing `task.last` and `task.next` with clock/calendar icons and `data-testid` attributes.
  - Added `TriggerSpec` import; renders a structured human-readable summary (schedule label or condition rule) when `triggerSpec` is present on the task payload, falling back to the raw `trigger` string.
  - Added `testid` prop to `ConfigRow` helper.
  - Added `data-testid="task-toggle-pause"`, `data-testid="task-edit"`, `data-testid="task-detail-status"`, `data-testid="task-detail-result"`, `data-testid="task-detail-history"` and per-row `data-testid="task-history-row-{i}"`.
  - Added `aria-label` to the pause/resume button.
  - Imported `Icons.calendar` for next-run and schedule rows.

### 2026-06-15 — Created
- **Motivation**: A single task needs an inspect/edit surface without leaving the collection.
- **Goal**: A URL-addressable drawer with config, run history, output and real pause/delete actions.
