# src/store/useAppStore.ts

## Responsibility
Global zustand store: navigation (view, active chat/topic, collapse states), chats + conversations + session metadata, tasks, proactive updates, global quick chat and toasts. Owns all server sync: loads persisted state via `bootstrap()` and persists every mutation through the typed RPC client.

## Key exports
- `useAppStore` hook, `View` / `SidebarMode` types
- `VIEW_PATH` (view → URL path map) and `viewFromPath(pathname)` (reverse), used
  by the `_app` layout to keep `view` in sync with the router.

## Dependencies
- Upstream: zustand, lib/api-client (Hono RPC), data layer (UPDATE_TO_CHAT mapping + nextId)
- Downstream: every stateful component

## Key notes
- Data flow: the store starts empty (new-user state, EmptyState renders); `bootstrap()` fills it with `GET /api/bootstrap`. On fetch failure the store stays empty and shows a retry toast.
- Mutations are optimistic: send/sendQuick append the user message immediately (ids generated client-side so D1 stores exactly what was rendered); createTask/toggleTask roll back and toast on API failure.
- `deliverMessage()` is the shared send pipeline (main chat + quick chat) — POST /api/messages returns the server-generated AI reply; a 600ms minimum delay keeps the thinking indicator visible.
- Design defaults locked from the prototype's tweak exploration: sidebar = history view, proactive = emphasized amber card, monitor card on.
- Leaving the Today page (backToChat / openUpdateInChat / openQuickInChat / newChat / selectChat) clears the "viewing" context so the quick chat never carries a stale chip.
- **Navigation is URL-driven.** The router is the source of truth; `view` is a cache the `_app` layout writes via `syncView()` from the active path. The layout binds the router's `navigate()` into the store (`bindNavigate`), and every view-switching action (`openChat/openToday/openTasks/openResearch/openArtifacts/openSettings/selectChat/newChat/backToChat/openQuickInChat/send/runArtifactShortcut`) navigates through `_navigate` rather than setting `view` directly.

## Change history

### 2026-06-14 — page-aware "new" action (`newForView`, `newTask`, `newArtifact`, `composerSeed`)
- **Motivation**: the single sidebar "新建对话" button (and ⌘N) did the same thing
  on every page, even though each page creates a different entity — tasks should
  start a task, Artifacts an artifact, the research canvas a research project.
- **Goal**: one button whose label + action follow the current page, without
  scattering the dispatch across components.
- **Key decisions**: added `NEW_ACTION` (per-`View` label + test id) and a single
  `newForView()` dispatch bound to both the sidebar button and ⌘N. Tasks and
  artifacts have no standalone form (they are produced by the chat agent's
  tools), so `newTask` / `newArtifact` reuse the new-chat reset but set a one-shot
  `composerSeed` (`帮我盯着 ` / `帮我做一组卡片：`) that the chat `Composer`
  consumes once (`clearComposerSeed`) — dropping the user into a fresh chat
  already primed. Research keeps its own welcome screen, so `newForView` calls
  `useResearchStore.getState().newResearch()` directly (this store now imports the
  research store; the dependency is one-way, no cycle).

### 2026-06-14 — quick chat folds by default (`rightCollapsed` semantics)
- **Motivation**: the quick chat became a customer-service-style floating bubble
  + popup; it should start folded (bubble only) and the bubble toggles it.
- **Change**: `rightCollapsed` now means "QuickChat widget folded" and its
  initial value flipped `false → true` (folded by default). The action
  (`setRightCollapsed`) is unchanged; the bubble drives it.

### 2026-06-13 — URL-driven navigation; settings becomes a route; drop `aiSetupOpen`
- **Motivation**: the user asked that every page have its own URL and that
  settings be a page instead of a modal. Navigation was a single `view` flag on
  the `/` route.
- **Goal**: make the router the source of truth while keeping the many existing
  components that read `s.view` working unchanged.
- **Key decisions**: added `VIEW_PATH` + `viewFromPath`, a `_navigate` bridge
  (`bindNavigate`) and `syncView` so the `_app` layout mirrors the URL into the
  cached `view`; rewired every view-switching action to call `_navigate(path)`
  (and no longer set `view` directly); added `'settings'` to `View` plus an
  `openSettings()` action; removed `aiSetupOpen` / `setAiSetupOpen` (the modal
  is gone — settings is the `/settings` route now).

### 2026-06-13 — docked right chat panel: drop `quickOpen`, add `rightCollapsed`
- **Motivation**: the quick chat moved from a slide-up overlay to a docked right
  panel (see App / QuickChat). The per-conversation open/closed toggle lost its
  consumer, but the panel as a whole now needs its own collapse state.
- **Change**: dropped `quickOpen` + `setQuickOpen` (removed from the state, the
  initial state, `sendQuick` and `openQuickInChat`); added `rightCollapsed` +
  `setRightCollapsed` for the whole-panel collapse (no peek, unlike the
  sidebar — re-opening is an explicit click from FloatingControls).
  `quickChatId` / `quickPending` / `quickCtx` are unchanged.

### 2026-06-13 — per-page sidebar nav: `openChat`, `focusItem`, `tasksFilter`
- **Motivation**: the sidebar became context-aware (a different list per page),
  which needed three new store hooks.
- **Goal**: support the "聊天" nav tile, sidebar-driven scroll-to-item on the
  Today/Tasks pages, and a sidebar-clearable tasks filter.
- **Change**: added `openChat()` (return to the chat view keeping the active
  conversation, unlike `newChat`); a generic `focusItem(id)` that sets
  `focusItemId` + bumps `focusItemTick` so the active center page can scroll the
  matching `[data-cid]` into view (and repeat clicks re-trigger); and
  `tasksFilter` + `setTasksFilter`, lifting the Tasks page's topic filter into
  the store so `TasksNavList` can clear it before jumping (avoids a
  setState-in-effect anti-pattern in `TasksView`).

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

### 2026-06-13 — quick-launch shortcut runner
- **Motivation**: the user wanted one-click shortcuts on the Artifacts page
  that generate without typing.
- **Goal**: `runArtifactShortcut(prompt)` + `artifactGenerating` flag — posts a
  canned prompt through `/api/messages` (so the create_card_artifact agent tool
  runs), records the exchange to a chat, then refreshes + selects the new deck
  while staying on the Artifacts page.
