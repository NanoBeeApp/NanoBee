# src/components/tasks/TasksView.tsx

## Responsibility
Full-page task center rendered in the center column (replaces the old right rail). Header with active/paused summary, topic filter chips (only topics that have tasks), the gold live-monitor card when the gold filter is selected, task cards in a two-column grid, an empty-state nudge and a "新建任务" button.

## Dependencies
- Upstream: store, topics, TaskCard, icons
- Downstream: App (rendered when `view === 'tasks'`)

## Key notes
- Opened from the sidebar "任务" entry (`openTasks()` sets `view: 'tasks'`).
- Filter now lives in the store (`tasksFilter`) so the sidebar `TasksNavList` can clear it before jumping to a task on another topic.
- A just-created task flashes in via the nbtoast animation (same as the old rail).
- Sidebar jump: a `focusItemId`/`focusItemTick` effect scrolls the matching `[data-cid]` task card into view; each task wrapper carries `data-cid={k.id}` and the page is the scroll container (`scrollRef`).

## Change history

### 2026-06-13 — scroll-to-task from the sidebar index + store-backed filter
- **Motivation**: the new `TasksNavList` sidebar index needs clicking a task to
  bring its card into view, and to never be blocked by the page's topic filter.
- **Goal**: react to the store's `focusItem` requests and let the sidebar clear
  the filter — without a setState-in-effect anti-pattern.
- **Change**: lifted the topic filter to the store (`tasksFilter` /
  `setTasksFilter`); added a `scrollRef` on `.nb-taskspage`, `data-cid` on each
  task wrapper, and a focus effect that scrolls the target into view. The
  sidebar clears the filter in its click handler, so the effect only scrolls.

### 2026-06-12 — created
- **Motivation**: user feedback — the always-on right rail crowded the chat page; tasks should be an explicit destination reached from the left sidebar instead of a third column.
- **Goal**: keep every rail capability (topic scoping, gold monitor, toggle, empty-state nudge, new-task button) on a full-width surface consistent with the Today page layout.
- **Key decisions**: topic scoping became user-driven filter chips instead of following the active chat topic, since the page is no longer rendered next to a conversation.
