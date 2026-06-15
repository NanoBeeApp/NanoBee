# src/components/tasks/TasksView.tsx

## Responsibility
Orchestrator for the Tasks page. Reads the URL (`useTasksUrl`) and renders one of
two surfaces — the clean single-focus home screen (`TasksHome`) or the secondary
"all tasks" manager (`AllTasksView`) — plus the detail drawer and the batch-upload
dialog as overlays. Keeping the surface, view mode, open drawer and dialog in the
URL makes every state bookmarkable and back-forward friendly.

## Dependencies
- Upstream: `useTasksUrl`, `useAppStore` (`tasks`), TasksHome, AllTasksView, TaskDetailDrawer, TaskUploadDialog, TaskTemplateModal, `styles/tasks.css`
- Downstream: route `/_app/tasks` (`tasks.tsx`)

## Change history

### 2026-06-15 — Pass onBatchCreated to TaskUploadDialog
- **Motivation**: After batch creation the user had no navigation to the new batch.
- **Changes**: Added `handleBatchCreated` callback that calls `bootstrap()` to refresh
  the task list from the server, then navigates to all-tasks with the new batch
  drawer open via `url.openTask(batchId)`. Passed as `onBatchCreated` prop to `TaskUploadDialog`.

### 2026-06-15 — Wired TaskTemplateModal
- **Motivation**: "从模板开始" button had a toast stub; replaced with a real URL-driven TaskTemplateModal overlay.
- **Change**: Replaced `onTemplate` toast with `url.openTemplate()`; removed `toast` import from store deps; added `TaskTemplateModal` import and conditional render driven by `url.tplCategory !== null`.

### 2026-06-15 — Redesigned into a clean single-focus home + secondary manager
- **Motivation**: User feedback — the first screen must be clean, single-purpose, with one visual focus, not a dashboard listing all complexity (view switch, filters, table/board, batch bar) at once.
- **Goal**: Make the home screen one focus (the task composer); push every management surface one click away.
- **Key decisions**: TasksView became a thin orchestrator. The read-only two-column grid + `TaskCard` were replaced by `TasksHome` (composer + running overview) and `AllTasksView` (list/table/board), with the detail drawer and batch-upload dialog as URL-addressable overlays. Page state moved into the URL (`useTasksUrl`). `TaskCard.tsx` was removed. A new scoped stylesheet `styles/tasks.css` (imported here) carries the `nb-tk-*` classes; the old `nb-taskspage` / `nb-tcard` classes are no longer used.

### 2026-06-15 — remove hardcoded "gold live monitor" card and MONITOR_TOPIC_ID logic
- **Motivation**: remove all demo/seed data and hardcoded fixed data so the app starts empty; the fake gold-monitor card was placeholder demo content, not real data.
- Deleted the `MONITOR_TOPIC_ID` constant, the monitor card conditional, and the `Sparkline` import.

### 2026-06-14 — remove the dead in-page "新建任务" button
- **Motivation**: the toolbar's "新建任务" button never had an onClick (dead UI), and the sidebar's page-aware "new" button now owns task creation.
- **Change**: dropped the toolbar button; `new-task-button` testid moved to the sidebar.

### 2026-06-13 — scroll-to-task from the sidebar index + store-backed filter
- **Motivation**: clicking a task in the sidebar index must bring its card into view, never blocked by the page filter.
- **Change**: lifted the topic filter to the store (`tasksFilter`); added a focus effect scrolling the target `[data-cid]` into view.

### 2026-06-12 — created
- **Motivation**: the always-on right rail crowded the chat page; tasks should be an explicit destination reached from the left sidebar.
- **Goal**: keep every rail capability on a full-width surface consistent with the Today page layout.
