# BatchSubtasks.tsx

## Responsibility
Live batch-task progress panel: progress bar (done/total + success/fail counts),
a scrollable subtask list (input, status dot, result summary / plain-language
error, per-row Retry button), "retry only failed" bulk action, and CSV export.
Polls `GET /api/tasks/batch/:id` every 3 seconds while the batch is still
running; stops polling when all rows are done or failed.

## Dependencies
- Upstream: `useAppStore` (`toast`), `Icons`, `types.ts` (`Task`)
- Downstream: `TaskRow` (mounts this when `isBatch && expanded`),
  `TaskDetailDrawer` (mounts this inside the batch section)
- API: `GET /api/tasks/batch/:id`, `POST /api/tasks/batch/:id/retry-failed`

## Key implementation notes
- `liveData` overrides `task.batch.subtasks` from the store once the first
  live fetch completes; falls back gracefully to the store data while loading.
- Polling interval is `POLL_MS = 3000 ms`; a `mountedRef` prevents state
  updates after unmount.
- `retryRow(subtaskId)` optimistically patches the local subtask status to
  `queued`, then fires the global `retry-failed` endpoint (resets ALL failed
  rows). Acceptable for MVP.
- CSV export is client-side Blob download — no server round-trip. Adds BOM
  (`﻿`) for Excel compatibility.
- `downloadCsv` uses a short-lived object URL revoked after 60 seconds.

## Change history

### 2026-06-15 — Full rewrite: static data → real API + polling
- **Motivation**: The previous version rendered `task.batch.subtasks` from the
  store (static snapshot). Users need live progress while the runner executes.
- **Changes**: Live polling, retry-failed, per-row retry, CSV export, progress
  bar with success/fail/pending counts.
