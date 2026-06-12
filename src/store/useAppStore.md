# src/store/useAppStore.ts

## Responsibility
Global zustand store: navigation (view, active chat/topic, collapse states), conversations + session metadata, tasks, proactive updates (read state), global quick chat and toasts.

## Key exports
- `useAppStore` hook, `selectUnreadCount` selector, `View` / `SidebarMode` types

## Dependencies
- Upstream: zustand, data layer (initial content + genReply + nextId)
- Downstream: every stateful component

## Key notes
- Design defaults locked from the prototype's tweak exploration: sidebar = history view, proactive = emphasized amber card, monitor card on.
- Replies are simulated with a 950ms timeout (REPLY_DELAY_MS) matching the prototype.
- Leaving the Today page (backToChat / openUpdateInChat / openQuickInChat / newChat / selectChat) clears the "viewing" context so the quick chat never carries a stale chip.

## Change history

### 2026-06-12 — created
- **Motivation**: the prototype kept all state in one React component; a store keeps the same single source of truth while letting components subscribe granularly.

### 2026-06-12 — fix
- **Motivation**: ⌘N from the Today page could leave a stale "正在看" context; newChat/selectChat now clear quickCtx.
