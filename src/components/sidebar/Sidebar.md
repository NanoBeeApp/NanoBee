# src/components/sidebar/Sidebar.tsx

## Responsibility
Left rail: brand row with collapse button, "新对话" (⌘N), the amber "今日事项" inbox entry with unread count, history/topics switch, scrollable list and account footer.

## Dependencies
- Upstream: store, ChatHistoryList, TopicGroupList, icons
- Downstream: App

## Change history

### 2026-06-12 — created
- **Motivation**: design handoff; the inbox entry is intentionally amber — the "AI reaches you" soul of the product gets the accent color.

### 2026-06-12 — server-backed chats
- **Motivation**: the sidebar listed the static demo chats, so chats created
  in past sessions never reappeared. It now passes the store's server-loaded
  `chats` down to both list views.
