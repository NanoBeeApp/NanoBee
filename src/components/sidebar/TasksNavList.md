# src/components/sidebar/TasksNavList.tsx

## Responsibility
The sidebar scroll-area list shown while the app is on the "任务" page. Lists
every automated task split into 进行中 / 已暂停 so running tasks lead. Clicking
an entry scrolls the task center to that task card.

## Core export / API
- `TasksNavList()` — self-contained; reads `tasks`, `focusItem`,
  `setTasksFilter` from `useAppStore`.

## Dependencies
- Upstream: `useAppStore`, icons, `Task` type
- Downstream: `Sidebar` (rendered when `view === 'tasks'`)

## Key implementation notes
- Click handler `jumpTo(id)` clears the task-page topic filter to `'all'` (so a
  task on any topic is in the DOM) and then calls `focusItem(id)`; `TasksView`
  scrolls the matching `[data-cid]` task card into view.
- Renders an empty-state line when there are no tasks.

## Change history

### 2026-06-13 — created
- **Motivation**: per the user request that each page's sidebar reflect its own
  list; the 任务 page previously showed the chat history in the sidebar.
- **Goal**: a status-grouped task index that lets the user jump to any task.
- **Key decision**: the task-page filter was lifted into the store
  (`tasksFilter`) so the click handler can clear it from the sidebar without a
  setState-in-effect anti-pattern.
