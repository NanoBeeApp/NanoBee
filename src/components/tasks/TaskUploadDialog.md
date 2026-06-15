# TaskUploadDialog.tsx

## Responsibility
Batch-upload dialog (`role=dialog`): real file picker (.csv/.tsv/.txt; .xlsx
shown as coming-soon/disabled). On file select, reads text client-side and
POSTs to `/api/tasks/batch/preview`; shows parsed row count + first-N-row
table preview + AI-detected input column + editable action description.
Confirms via `POST /api/tasks/batch`, then closes and invokes `onBatchCreated`
so the caller can navigate to the new batch.

## Dependencies
- Upstream: `useAppStore` (`toast`), `Icons`, `TOPICS`
- Downstream: `TasksView` (mounts this dialog when `url.uploadOpen === true`)
- API: `POST /api/tasks/batch/preview`, `POST /api/tasks/batch`

## Key implementation notes
- `.xlsx` files are rejected client-side with a clear message (consistent with
  the server-side `rejectXlsx()` guard); the drop zone shows ".xlsx 即将支持".
- File text is read via the browser's `File.text()` API (no heavy npm deps).
- The preview request is aborted on new file selection or component unmount via
  `AbortController`.
- Column header highlighted in the preview table when it's the selected input column.
- `onBatchCreated(batchId)` prop allows the parent (`TasksView`) to navigate
  to the new batch immediately.

## Change history

### 2026-06-15 — Full rewrite: hardcoded preview → real API
- **Motivation**: Wired to real `/api/tasks/batch/preview` and `/api/tasks/batch`
  endpoints instead of the hardcoded placeholder (companies.xlsx / 3 rows).
- **Changes**: File picker, drag-and-drop, preview fetch, field-mapping card,
  topic selector, run-mode toggle, CSV export note, and actual batch creation.
