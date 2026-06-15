# TaskUploadDialog.tsx

## Responsibility
Batch-upload dialog (`role=dialog`): pick a file, map the primary input column +
the per-row action, choose a run mode, preview, then "开始批量执行". The dialog caps
its height and scrolls its body so the preview + footer buttons stay visible.

## Dependencies
- Upstream: `useAppStore` (`toast`), `Icons`
- Downstream: TasksView

## Key implementation notes
- Confirming surfaces a toast — the real per-row execution pipeline (parsing, scheduling, concurrency, retries) is a later backend concern.

## Change history

### 2026-06-15 — Created
- **Motivation**: Users need to spawn many tasks at once by uploading a CSV/Excel/doc with a per-row action.
- **Goal**: The field-mapping + preview UI for batch creation, behind the low-weight "上传文件批量" entry.
