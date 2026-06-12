# src/store/useAppStore.ts

## Responsibility
Global zustand store: navigation (view, active chat/topic, collapse states), chats + conversations + session metadata, tasks, proactive updates (read state), global quick chat and toasts. Owns all server sync: loads persisted state via `bootstrap()` and persists every mutation through the typed RPC client.

## Key exports
- `useAppStore` hook, `selectUnreadCount` selector, `View` / `SidebarMode` types

## Dependencies
- Upstream: zustand, lib/api-client (Hono RPC), data layer (instant-render fallback content + nextId)
- Downstream: every stateful component

## Key notes
- Data flow: initial state is the bundled demo data (instant paint); `bootstrap()` replaces it with `GET /api/bootstrap` (D1 is seeded with the same content, so the swap is invisible). On fetch failure the app stays usable on local data and shows a toast.
- Mutations are optimistic: send/sendQuick append the user message immediately (ids generated client-side so D1 stores exactly what was rendered); createTask/toggleTask/markRead/markAllRead roll back and toast on API failure.
- `deliverMessage()` is the shared send pipeline (main chat + quick chat) — POST /api/messages returns the server-generated AI reply; a 600ms minimum delay keeps the thinking indicator visible.
- Design defaults locked from the prototype's tweak exploration: sidebar = history view, proactive = emphasized amber card, monitor card on.
- Leaving the Today page (backToChat / openUpdateInChat / openQuickInChat / newChat / selectChat) clears the "viewing" context so the quick chat never carries a stale chip.

## Change history

### 2026-06-12 — created
- **Motivation**: the prototype kept all state in one React component; a store keeps the same single source of truth while letting components subscribe granularly.

### 2026-06-12 — fix
- **Motivation**: ⌘N from the Today page could leave a stale "正在看" context; newChat/selectChat now clear quickCtx.

### 2026-06-12 — D1 persistence
- **Motivation**: everything reset on reload — chats, tasks and read state were memory-only and replies were generated in the browser, so the product's core promise (the AI keeps watching for you) was an illusion.
- **Goal**: every user action survives a reload; reply generation moves server-side behind POST /api/messages so a real LLM can be swapped in later.
- **Key decisions**: optimistic updates with rollback instead of loading spinners (chat UX must stay instant); client-generated nanoid ids so no id remapping is needed after persistence; the bundled demo data stays as offline fallback rather than being deleted.
