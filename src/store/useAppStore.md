# src/store/useAppStore.ts

## Responsibility
Global zustand store: navigation (view, active chat/topic, collapse states), chats + conversations + session metadata, tasks, proactive updates, global quick chat and toasts. Owns all server sync: loads persisted state via `bootstrap()` and persists every mutation through the typed RPC client.

## Key exports
- `useAppStore` hook, `View` / `SidebarMode` types

## Dependencies
- Upstream: zustand, lib/api-client (Hono RPC), data layer (UPDATE_TO_CHAT mapping + nextId)
- Downstream: every stateful component

## Key notes
- Data flow: the store starts empty (new-user state, EmptyState renders); `bootstrap()` fills it with `GET /api/bootstrap`. On fetch failure the store stays empty and shows a retry toast.
- Mutations are optimistic: send/sendQuick append the user message immediately (ids generated client-side so D1 stores exactly what was rendered); createTask/toggleTask roll back and toast on API failure.
- `deliverMessage()` is the shared send pipeline (main chat + quick chat) — POST /api/messages returns the server-generated AI reply; a 600ms minimum delay keeps the thinking indicator visible.
- Design defaults locked from the prototype's tweak exploration: sidebar = history view, proactive = emphasized amber card, monitor card on.
- Leaving the Today page (backToChat / openUpdateInChat / openQuickInChat / newChat / selectChat) clears the "viewing" context so the quick chat never carries a stale chip.

## Change history

### 2026-06-13 — temporary sidebar peek state (`sidePeek`)
- **Motivation**: the collapsed sidebar only supported a persistent expand; the
  user wanted the left-edge reveal to open it *temporarily* and auto-close on
  pointer leave, while the panel icon keeps it pinned.
- **Goal**: model the two open modes separately without coupling them.
- **Change**: added `sidePeek` boolean plus `peekSidebar()` (sets peek only when
  collapsed) and `endPeek()` (clears peek). `setSideCollapsed` now also clears
  `sidePeek`, so pinning open or collapsing always ends a peek.

### 2026-06-13 — remove the read/unread feature
- **Motivation**: user asked to drop read-state management entirely (unread
  badges, mark-as-read flows, the "全部读完了" summary).
- **Change**: deleted `markRead` / `markAllRead` and the `selectUnreadCount`
  selector; `openUpdateInChat` no longer marks anything read; `todayFilter`
  lost its 'unread' value ('all' | topic id).

### 2026-06-12 — created
- **Motivation**: the prototype kept all state in one React component; a store keeps the same single source of truth while letting components subscribe granularly.

### 2026-06-12 — fix
- **Motivation**: ⌘N from the Today page could leave a stale "正在看" context; newChat/selectChat now clear quickCtx.

### 2026-06-12 — D1 persistence
- **Motivation**: everything reset on reload — chats, tasks and read state were memory-only and replies were generated in the browser, so the product's core promise (the AI keeps watching for you) was an illusion.
- **Goal**: every user action survives a reload; reply generation moves server-side behind POST /api/messages so a real LLM can be swapped in later.
- **Key decisions**: optimistic updates with rollback instead of loading spinners (chat UX must stay instant); client-generated nanoid ids so no id remapping is needed after persistence; the bundled demo data stays as offline fallback rather than being deleted.

### 2026-06-12 — todayFilter lifted into the store
- **Motivation**: the Today page keeps the sidebar now, and its TodayNav
  must drive the same filter the reading surface renders; component-local
  state could not be shared.
- **Goal**: `todayFilter` ('all' | 'unread' | topic id) + `setTodayFilter`
  as the single source of truth for Today-page filtering.

### 2026-06-12 — empty initial state (no bundled demo data)
- **Motivation**: real accounts saw the prototype's demo chats — the bundle
  rendered demo data before (and instead of, on API failure) the server
  state, so a logged-in user could never get a clean new-user view.
- **Goal**: the app boots into the EmptyState and only ever shows what the
  server returns; demo content lives solely behind the local-dev seed.
- **Key decisions**: initial chats/convos/tasks/updates are empty and
  `activeChatId` is null (ChatView already renders EmptyState for that);
  the offline fallback to bundled demo data was dropped — an error toast
  replaces it, since silently showing fake data is worse than an empty view.

### 2026-06-12 — 'tasks' view added, railCollapsed removed
- **Motivation**: the right task rail crowded the chat page; tasks moved
  behind a sidebar entry, so the rail's collapse state became meaningless.
- **Goal**: `View` gains 'tasks' with `openTasks()`; `railCollapsed` /
  `setRailCollapsed` deleted (createTask no longer force-expands a rail —
  the creation toast is the feedback).

### 2026-06-12 — aiSetupOpen flag
- **Motivation**: the AI provider settings dialog must be openable from the
  account menu, not only auto-shown on first login; cross-component UI state
  belongs in the app store.
- **Goal**: `aiSetupOpen` + `setAiSetupOpen` consumed by
  `AiProviderSetupDialog` and triggered from `AccountFoot`.

### 2026-06-13 — Artifacts state (replaces the standalone cards view)
- **Motivation**: card generation moved from a standalone page to a chat
  trigger; the generated decks are collected on a new Artifacts page.
- **Goal**: `view: 'artifacts'` (was `'cards'`), `openArtifacts(id?)` /
  `loadArtifacts` / `selectArtifact` / `deleteArtifact`, and `artifacts` /
  `selectedArtifactId` / `artifactsLoading` state. `deliverMessage` now returns
  the reply's `artifacts`; `send`/`sendQuick` refresh the list + toast when a
  reply produced one.
