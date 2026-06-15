# src/worker/batch/repo.ts

## Purpose

D1 repository for the `batch_subtasks` table. Provides typed read/write helpers
used by the batch routes and the batch runner.

## Owner-scoping contract

Every query that touches user data includes an `owner` predicate. This mirrors
the pattern used in `src/worker/artifacts/repo.ts` and `src/worker/db/repo.ts`.
The only exception is internal runner helpers (`listPendingSubtasks`,
`resetStaleRunningSubtasks`) which use only `batch_id` because they are called
from within the runner which already holds the verified batch_id.

## D1 batching

`createBatchSubtasks` uses `db.batch()` in 50-row chunks to minimize network
round trips when inserting large lists. Each `nanoid()` call is inside function
scope (never at module top-level, per Workers deploy rules).

## Key functions

| Function | Description |
|---|---|
| `createBatchSubtasks(db, owner, batchId, inputs[])` | Bulk-insert subtask rows |
| `listBatchSubtasks(db, owner, batchId)` | All subtasks for a batch (owner-scoped) |
| `getBatchProgress(db, batchId, owner?)` | Aggregated counts (total/pending/running/done/failed); owner param added for defence-in-depth scoping from HTTP routes |
| `listPendingSubtasks(db, batchId, limit)` | Next N pending rows for the runner |
| `listFailedSubtasks(db, owner, batchId)` | Failed rows for retry-failed endpoint |
| `markSubtaskRunning(db, id)` | CAS: pending → running; returns `true` if this call claimed the row, `false` if already claimed by another runner |
| `markSubtaskDone(db, id, resultText)` | running → done |
| `markSubtaskFailed(db, id, errorText)` | → failed + attempts++ |
| `resetFailedSubtasks(db, owner, batchId)` | Reset failed → pending for retry |
| `resetStaleRunningSubtasks(db, batchId)` | Reset interrupted running → pending |

## Change history

- 2026-06-15: Security review fixes — `getBatchProgress` now accepts an optional `owner` parameter so HTTP-route callers pass owner for defence-in-depth scoping. `markSubtaskRunning` now returns `boolean` so the caller can skip execution when another concurrent runner already claimed the row (prevents double LLM calls on concurrent `/run` requests). Added security rationale comments to `listPendingSubtasks` and `resetStaleRunningSubtasks` clarifying why they use `batchId` only.
- 2026-06-15: Initial creation for batch task engine (P3).
