# repo.ts (task-runs)

D1 repository for the `task_runs` table introduced in migration 0019.

## Purpose

Centralises all SQL for inserting and querying task run history in one place,
following the same pattern as `src/worker/batch/repo.ts` and `src/worker/db/repo.ts`.
Route handlers stay thin; SQL lives here.

## API surface

| Export | Description |
|--------|-------------|
| `createTaskRun(db, input)` | Insert one completed run row; returns the generated `run_<nanoid>` id. |
| `listTaskRuns(db, owner, taskId, limit?, offset?)` | List recent runs newest-first, owner-scoped, paginated (max 100). |
| `countTaskRuns(db, owner, taskId)` | Count total runs for pagination metadata. |

## Owner scoping

Every query includes an `owner` predicate. `owner` is either the signed-in user's
id (from the session cookie) or `"anon"` for signed-out visitors. This mirrors the
pattern across the entire repo layer.

## Bounded growth

`createTaskRun` lazily prunes old rows after every insert via a `DELETE ... WHERE id NOT IN (SELECT ... LIMIT MAX_RUNS_PER_TASK)` statement. The cap is currently **200 rows per task**. This prevents the table from growing unboundedly for long-running condition tasks that fire every cooldown cycle. Prune failures are logged but never propagate to the caller.

## Change history & rationale

- **2026-06-15** — Security review fix: added lazy per-task prune in `createTaskRun` (cap 200 rows) to prevent unbounded growth. Added `MAX_RUNS_PER_TASK` constant.
- **2026-06-15** — Created for task-reliability milestone. One row per logical task
  execution (not per sub-task for batch tasks; batch-level rows are sufficient and
  keep table volume manageable).
