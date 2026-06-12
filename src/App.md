# src/App.tsx

## Responsibility
App shell: two-column grid (sidebar | center) with a collapsible sidebar, chat/today/tasks view switching, global overlays (notification dropdown, quick chat, selection float, toasts) and the ⌘N new-chat shortcut.

## Key exports
`App` (default).

## Dependencies
- Upstream: store/useAppStore, all top-level components
- Downstream: src/main.tsx

## Key notes
- The sidebar stays on every view and is user-collapsible (`side-collapsed` drives explicit grid-column sizing in app.css; prototype fixed a 0-width chat bug this way).
- Center view routing: 'today' → TodayView, 'tasks' → TasksView, otherwise ChatView.

## Change history

### 2026-06-12 — created
- **Motivation**: implement the approved NanoBee design (chat home + Today reading page + global quick chat) from the Claude Design handoff bundle.
- **Decision**: view state lives in the store ('chat' | 'today') rather than a URL router — matches the prototype's stateful navigation; routing can be added when real persistence lands.

### 2026-06-12 — D1 bootstrap
- **Motivation**: the app rendered bundled demo data only; persisted state in
  D1 needed a load point. App mount now calls `store.bootstrap()` once to
  replace the demo data with the server state (seeded identically, so the
  swap is invisible).

### 2026-06-12 — right task rail removed, tasks become a view
- **Motivation**: user feedback — the permanent right-hand task list crowded
  the chat page; tasks should be reached from the left sidebar instead.
- **Goal**: a two-column shell; the task list lives in the new full-page
  `TasksView` routed by `view === 'tasks'`.
- **Key decisions**: dropped `railCollapsed` and the `rail-collapsed` grid
  class entirely instead of keeping a dead third column.

### 2026-06-12 — Today page keeps the sidebar
- **Motivation**: the Today page used to force-collapse the sidebar for an
  immersive surface; the user asked for the sidebar to stay there (the
  sidebar body becomes the TodayNav reading nav).
- **Goal**: collapse is purely user-controlled on every view; immersive
  reading is still one click away via the collapse button.
