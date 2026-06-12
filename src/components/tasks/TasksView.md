# src/components/tasks/TasksView.tsx

## Responsibility
Full-page task center rendered in the center column (replaces the old right rail). Header with active/paused summary, topic filter chips (only topics that have tasks), the gold live-monitor card when the gold filter is selected, task cards in a two-column grid, an empty-state nudge and a "新建任务" button.

## Dependencies
- Upstream: store, topics, TaskCard, icons
- Downstream: App (rendered when `view === 'tasks'`)

## Key notes
- Opened from the sidebar "任务" entry (`openTasks()` sets `view: 'tasks'`).
- Filter is component-local state (resets to 全部 on re-entry) — unlike `todayFilter` it has no second consumer, so it does not need to live in the store.
- A just-created task flashes in via the nbtoast animation (same as the old rail).

## Change history

### 2026-06-12 — created
- **Motivation**: user feedback — the always-on right rail crowded the chat page; tasks should be an explicit destination reached from the left sidebar instead of a third column.
- **Goal**: keep every rail capability (topic scoping, gold monitor, toggle, empty-state nudge, new-task button) on a full-width surface consistent with the Today page layout.
- **Key decisions**: topic scoping became user-driven filter chips instead of following the active chat topic, since the page is no longer rendered next to a conversation.
