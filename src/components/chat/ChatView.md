# src/components/chat/ChatView.tsx

## Responsibility
Center chat surface: auto-scrolling message feed, pending indicator, composer, and the empty state for new chats.

## Dependencies
- Upstream: store, topics, MessageView, ThinkingIndicator, Composer, EmptyState
- Downstream: App

## Change history

### 2026-06-12 — created
- **Motivation**: design handoff; isolates feed scrolling behavior from the App shell.

### 2026-06-12 — created-state from persisted tasks
- **Motivation**: after a reload, a confirmed suggestion card showed "创建任务"
  again because `createdTaskIds` is session memory. The card now also counts a
  suggestion as created when its id exists in the persisted task list.
