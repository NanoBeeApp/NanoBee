# src/worker/scheduler/batch-runner.ts

## Purpose

The run-once batch runner: picks up pending subtasks for a batch, executes
them with bounded concurrency, stores results (or errors), and advances the
batch's progress.

## Design

- **Bounded concurrency**: `CONCURRENCY_LIMIT = 4` parallel subtasks per chunk.
- **Chunked**: each `runBatch()` call processes at most `CHUNK_SIZE = 20` rows
  so it fits inside a Cloudflare Worker's time budget. Large batches make
  progress across multiple `ctx.waitUntil` invocations.
- **Row isolation**: every row failure is caught and stored as `status='failed'`
  without aborting the batch.
- **Stale running reset**: on entry, any 'running' rows from a previous
  interrupted invocation are reset to 'pending' before picking up new work.
- **Action execution**: builds a search query from `action + input`, calls the
  data-hub `websearch` source, then asks the LLM to summarize. Falls back to
  LLM-only when the data hub is unavailable.
- **Owner-level AI config**: uses `resolveAiConfig(env, owner)` so users with
  their own API keys use them; falls back to the backend default key.
- **Workers safety**: `Date.now()` / `nanoid()` only inside function scope.

## Invocation

Called via `ctx.waitUntil(runBatch(env, batchId, owner))` from:
- `POST /api/tasks/batch` (create + immediate run)
- `POST /api/tasks/batch/:id/run` (manual trigger)
- `POST /api/tasks/batch/:id/retry-failed` (resets failed → pending, then runs)

## Change history

- 2026-06-15: Fixed TS2352/TS7053 — replaced both `getTask()` usages (which return `Task`, which has no index signature) with two internal D1 helpers `readTaskPayload` / `writeTaskPayload` that operate directly on the raw payload JSON column. This eliminates the need to cast `Task` to `Record<string, unknown>` and the subsequent `delete patchedPayload["id"]` etc. (which TypeScript correctly rejected). The import of `getTask` from `../db/repo` was removed as it is no longer needed.


- 2026-06-15: Added `task_runs` recording per chunk execution. After each chunk
  completes, `createTaskRun()` writes a row with `status='ok'` or `status='failed'`
  and a summary of how many subtasks succeeded/failed. Uses `formatErrorText()`
  from `failure-explainer.ts` to convert errors to human-readable form. Switched
  `Promise.all` → `Promise.allSettled` to accurately track per-row failures at
  the chunk level (individual row failures were already isolated in `processSubtask`).

- 2026-06-15: Updated to write progress back to the parent task payload after
  each chunk so the task list (bootstrap) shows an accurate progress bar without
  needing a real-time poll from the list view. Sets `batch.total/done/failed`
  and `runState` on the parent task payload.

- 2026-06-15: Security review fixes — (1) `processSubtask` now checks the boolean return value of `markSubtaskRunning`; if `false`, it skips `executeSubtask` to prevent double LLM calls when two concurrent runners pick the same pending row. (2) `runBatch` now accepts an optional `ExecutionContext` parameter; when provided and the batch still has pending rows after the current chunk, it self-chains via `ctx.waitUntil(runBatch(...))` so batches larger than `CHUNK_SIZE=20` rows complete automatically without manual re-triggering. (3) `getBatchProgress` callers now pass `owner` for defence-in-depth scoping.
- 2026-06-15: Initial creation for batch task engine (P3).
