# src/worker/routes/batch.ts

## Purpose

Hono route module for the batch task API (`/api/tasks/batch/*`).
Handles file parsing, AI column detection, batch creation, progress polling,
manual run triggering, and retry-failed.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tasks/batch/preview` | Parse file text, detect input column via AI |
| POST | `/api/tasks/batch` | Create parent task + subtasks, kick runner |
| GET  | `/api/tasks/batch/:id` | Parent task + all subtasks + progress counts |
| POST | `/api/tasks/batch/:id/run` | Kick off / resume the runner |
| POST | `/api/tasks/batch/:id/retry-failed` | Reset failed rows and re-run |

## Design notes

- All endpoints use `ownerOf()` to scope queries — identical to `routes/tasks.ts`.
- The runner is always kicked via `ctx.waitUntil()` so it outlives the HTTP response.
- `nanoid()` is inside the handler scope (never at module top-level).
- `.xlsx` files are rejected immediately with a "coming soon" error.
- Status mapping: DB `pending→queued`, `done→success` to match the UI's
  `SubTaskStatus` enum.

## Wire shapes

### POST /preview response
```json
{
  "format": "csv",
  "headers": ["Company", "Industry", "Website"],
  "hasHeader": true,
  "totalRows": 100,
  "rawLineCount": 101,
  "previewRows": [{ "fields": [...], "lineNum": 2 }],
  "detection": {
    "inputColumnIndex": 0,
    "inputColumnName": "Company",
    "suggestedAction": "Search for latest funding news for each company",
    "fromAi": true
  }
}
```

### POST / response
```json
{ "batchId": "t_batch_xxx", "title": "...", "rowCount": 100 }
```

### GET /:id response
```json
{
  "task": { "id": "...", "batch": { "total": 100, "done": 42, "failed": 1, "subtasks": [...] } },
  "progress": { "total": 100, "pending": 57, "running": 0, "done": 42, "failed": 1 }
}
```

## Change history

- 2026-06-15: Security review fixes — (1) All `getBatchProgress` calls now pass `owner` for defence-in-depth owner scoping. (2) All `runBatch` calls now pass `c.executionCtx` so the runner can self-chain via `waitUntil` for batches larger than `CHUNK_SIZE=20` rows.
- 2026-06-15: Updated `POST /api/tasks/batch` to include initial `batch` field
  in the parent task payload (`{ total, done: 0, failed: 0, subtasks: [] }`)
  so the task list row shows the correct total count from the moment of creation.
- 2026-06-15: Initial creation for batch task engine (P3).
