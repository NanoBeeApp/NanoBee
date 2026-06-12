# src/components/sidebar/Sidebar.tsx

## Responsibility
Left rail: brand row with collapse button, "新对话" (⌘N), the amber "今日事项" inbox entry with unread count, the "任务" entry (opens the full-page task center) with an active-task count, and a context-aware body — history/topics switch + lists in chat view, the TodayNav reading nav on the Today page — plus the account footer.

## Dependencies
- Upstream: store, AccountFoot, ChatHistoryList, TopicGroupList, TodayNav, icons
- Downstream: App

## Change history

### 2026-06-12 — created
- **Motivation**: design handoff; the inbox entry is intentionally amber — the "AI reaches you" soul of the product gets the accent color.

### 2026-06-12 — server-backed chats
- **Motivation**: the sidebar listed the static demo chats, so chats created
  in past sessions never reappeared. It now passes the store's server-loaded
  `chats` down to both list views.

### 2026-06-12 — real account footer
- **Motivation**: the footer showed a hardcoded demo persona ("林晚晴");
  with the auth system the shell must reflect the real session.
- **Goal**: footer delegated to the new `AccountFoot` component
  (login entry when signed out, user summary + logout when signed in).

### 2026-06-12 — "任务" entry added
- **Motivation**: the right task rail was removed (it crowded the chat page);
  the task list needed a first-class entry point in the left sidebar.
- **Goal**: a neutral entry below "今日事项" that opens `TasksView` and shows
  the number of running tasks; amber stays reserved for the inbox soul.

### 2026-06-12 — sidebar stays on the Today page (TodayNav body)
- **Motivation**: the Today page used to hide the sidebar entirely; the user
  asked for it to stay there with useful features.
- **Goal**: on the Today page the body swaps to `TodayNav` (reading progress,
  unread/topic filters, quick actions) and the history/topics switch hides —
  chat lists are not relevant while reading.
