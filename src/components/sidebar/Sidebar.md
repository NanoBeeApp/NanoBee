# src/components/sidebar/Sidebar.tsx

## Responsibility
Left rail: brand row with collapse button, a uniform 3×2 nav grid (聊天 / 今日事项
/ 任务 / Artifacts / 研究画布 / 设置 — Chat / Today / Tasks / Artifacts / Research
Canvas / Settings), the history/topics switch, then the "新建对话" (⌘N — New Chat)
button at the foot of the fixed header. The scroll area below is
**context-aware**: it renders the list that belongs to the current page (chats,
today items, tasks, decks, or research projects). The history/topics switch only
shows on the chat view. The account avatar lives in the top-right floating bar
(`FloatingControls` / `AccountFoot`); the Settings tile opens the AI/settings
dialog (`setAiSetupOpen`).

## Dependencies
- Upstream: store, ChatHistoryList, TopicGroupList, TodayNavList, TasksNavList,
  ArtifactsNavList, ResearchNavList, icons
- Downstream: App

## Change history

### 2026-06-14 — page-aware "new" button (label + action follow the page)
- **Motivation**: user feedback — the foot button always said "新建对话" (New Chat)
  and made a chat, even on the Tasks / Artifacts / Research Canvas pages where
  "new" should create that page's own entity.
- **Change**: the button now reads its label + test id from `NEW_ACTION[view]`
  (新建对话 / 新建任务 / 新建 Artifact / 新建研究 — New Chat / New Task / New
  Artifact / New Research) and its onClick calls the store's `newForView()`
  dispatch (same action ⌘N triggers). Replaced the `newChat` binding with
  `newForView`. The now-redundant "New Research" item was dropped from
  `ResearchNavList` and the dead "New Task" placeholder from `TasksView`, so each
  page has a single canonical "new" affordance.

### 2026-06-14 — drop nav count badges (Today / Tasks)
- **Motivation**: user feedback — the "5" / "25" pills on the Today and Tasks
  tiles were unnecessary visual noise on the rail. Per the project's minimalism
  rule (only keep elements that carry core function), badges that merely repeat a
  count are decoration.
- **Change**: removed both `count` spans (and their `today-count` /
  `tasks-active-count` testids), the now-unused `activeTaskCount` / `todayCount`
  derivations, the `updates` selector that only fed `todayCount`, and the
  `.nb-nav-tile .count` CSS rule.

### 2026-06-13 — settings tile navigates to /settings (was: open modal)
- **Motivation**: settings became a page with its own URL instead of a modal.
- **Change**: the Settings tile now calls `openSettings()` (router navigation) and
  gets an `active` state when `view === 'settings'`, like the other nav tiles;
  the `setAiSetupOpen` import was replaced by `openSettings`.

### 2026-06-13 — recolor nav tiles to neutral cards + indigo selection
- **Motivation**: the provided mockup replaced the amber-filled tile block with
  neutral white cards and an indigo (`--brand-2`) selection accent. The solid
  amber grid was too warm/heavy for a navigation rail and the active tile read
  ambiguously against the other amber tiles.
- **Goal**: match the mockup — quiet white tiles by default, an unmistakable
  indigo "selected" state, and a rounded icon-chip on every tile.
- **Key decisions**: (1) each icon now sits in a rounded chip
  (`--surface-2` fill, ink icon); the selected tile flips its chip to a filled
  `--brand-2` square with a white icon. (2) selected tile = `--brand-soft`
  lavender fill + `--brand-2` border + a soft indigo ring (replaces the amber
  border/glow). (3) count badges recolored from amber to `--brand-2`. Amber now
  stays reserved for the brand glyph and AI-initiated "proactive" moments, not
  the nav chrome.

### 2026-06-13 — compact horizontal nav tiles
- **Motivation**: user feedback — the tall square tiles (icon stacked above
  label, `min-height: 98px`) ate too much vertical space in the rail.
- **Goal**: shorter tiles with a smaller label.
- **Key decision**: switch `.nb-nav-tile` from a column to a horizontal row
  (small icon-chip on the left, label on one line to its right), drop the fixed
  min-height, and shrink padding / chip (46→30px) / icon (20→17px) / label
  (15→13px). The count badge stops being an absolute top-right pill and trails
  inline at the right end (`margin-left:auto`).

### 2026-06-13 — uniform 3×2 grid, Settings tile, new-chat moved to foot
- **Motivation**: design handoff — the user wanted the rail laid out as six
  equal tiles (Chat leading a balanced 3×2 grid instead of a wide row), a
  Settings entry surfaced as a first-class tile, a count badge on Today, and the
  new-chat action relocated to the bottom of the fixed header as a quiet white
  button.
- **Goal**: match the mockup — amber tiles as the rail's anchor, new-chat
  secondary.
- **Key decisions**: (1) dropped the `wide` modifier so the Chat tile is a
  normal tile; every tile is now the same size with icon top-left / label
  bottom-left. (2) Added a Settings tile wired to `setAiSetupOpen(true)` — the
  app's only settings surface today; it is an action tile (no persistent active
  state). (3) The Today tile shows a `today-count` badge (count of `updates` in
  the "今天" group), mirroring the existing Tasks active-count badge. (4) Moved
  `nb-newchat` below the switch and restyled it white/outlined (was brand-filled,
  above the grid); renamed "新对话" → "新建对话" (New Chat).

### 2026-06-13 — context-aware sidebar list + Chat nav tile
- **Motivation**: the user wanted the sidebar list to reflect the current page
  (today items on Today, tasks on Tasks, decks on Artifacts, projects on
  Research Canvas) instead of always showing the chat history, plus a dedicated
  Chat tile to return to the chat view from any page.
- **Goal**: per-page sidebar lists, with the chat view keeping its
  history/topics list + switch.
- **Key decision**: added a wide `nb-nav-tile` for Chat (it is both the primary
  view and the way back to chat, so it leads the grid) and dispatched the
  scroll-area content by `view` to four new self-contained list components. This
  reverses the earlier "chat lists stay visible on every page" decision — the
  new Chat tile is now the one-click way back, so the chat list no longer needs
  to be omnipresent. The history/topics switch is gated to the chat view.

### 2026-06-13 — account footer moved to the top-right corner
- **Motivation**: user request — move the sidebar's user icon and settings
  button to the page's top-right corner.
- **Goal**: keep the left rail focused on navigation and the chat lists.
- **Change**: removed `<AccountFoot />` (and its import) from the rail; the
  account avatar + settings gear now render in `FloatingControls`'s
  top-right float.

### 2026-06-13 — auto-close the temporary peek on pointer leave
- **Motivation**: the new edge-reveal "peek" opens the sidebar as a temporary
  overlay; it needs to close itself once the user moves away, otherwise it would
  linger like a pinned sidebar.
- **Goal**: the rail collapses again as soon as the pointer leaves it (unless it
  was pinned open via the panel icon).
- **Change**: added `onMouseLeave={endPeek}` to the `<aside>`. `endPeek` is a
  no-op when not peeking, so it is safe to attach unconditionally.

### 2026-06-13 — Arc-style two-column nav grid
- **Motivation**: the four navigation entries (Today / Tasks / Updates Cards /
  Research Canvas) were stacked as full-width rows, eating vertical space and
  pushing the chat list down. The user wanted the Arc browser sidebar look.
- **Goal**: lay the four entries out as a compact 2×2 grid of tiles.
- **Change**: wrapped them in `.nb-nav-grid` and replaced the per-entry
  classes (`nb-inbox-entry` / `nb-tasks-entry`) with a single unified
  `nb-nav-tile` (icon top-left, label bottom-left, count badge floated
  top-right). All four share the amber soft style for a cohesive grid; the
  active tile keeps the amber border + glow ring.

### 2026-06-13 — chat lists stay visible on the Today page (TodayNav removed)
- **Motivation**: opening Today swapped the sidebar body for TodayNav, so the
  chat lists vanished and the only obvious way back was the New Chat button —
  the "Back to Chat" row was buried at the bottom of the filters. The Tasks page
  already kept the chat lists, so Today was also inconsistent.
- **Goal**: the sidebar is stable global navigation — clicking any chat (or the
  history/topics switch) works from every view, so no dedicated back button is
  needed. The Today filters moved into the page itself (`TodayFilterBar`).
- **Change**: dropped the `TodayNav` branch and the `isToday` special-casing;
  `TodayNav.tsx` deleted.

### 2026-06-13 — remove the read/unread feature
- **Motivation**: user asked to drop read-state management entirely.
- **Change**: the Today entry no longer shows an unread-count badge.

### 2026-06-12 — created
- **Motivation**: design handoff; the Today entry is intentionally amber — the "AI reaches you" soul of the product gets the accent color.

### 2026-06-12 — server-backed chats
- **Motivation**: the sidebar listed the static demo chats, so chats created
  in past sessions never reappeared. It now passes the store's server-loaded
  `chats` down to both list views.

### 2026-06-12 — real account footer
- **Motivation**: the footer showed a hardcoded demo persona;
  with the auth system the shell must reflect the real session.
- **Goal**: footer delegated to the new `AccountFoot` component
  (login entry when signed out, user summary + logout when signed in).

### 2026-06-12 — Tasks entry added
- **Motivation**: the right task rail was removed (it crowded the chat page);
  the task list needed a first-class entry point in the left sidebar.
- **Goal**: a neutral entry below Today that opens `TasksView` and shows the
  number of running tasks; amber stays reserved for the Today/inbox soul.

### 2026-06-12 — sidebar stays on the Today page (TodayNav body)
- **Motivation**: the Today page used to hide the sidebar entirely; the user
  asked for it to stay there with useful features.
- **Goal**: on the Today page the body swaps to `TodayNav` (reading progress,
  unread/topic filters, quick actions) and the history/topics switch hides —
  chat lists are not relevant while reading updates.

### 2026-06-13 — Artifacts nav entry
- **Motivation**: the standalone Updates Cards page was replaced by the
  chat-triggered Artifacts page.
- **Goal**: the nav tile now opens the Artifacts view (`openArtifacts()`,
  testid `artifacts-entry`, label "Artifacts") instead of the cards view.

### 2026-06-15 — Compare nav tile added
- **Motivation**: wiring the compare feature into the sidebar so users can reach
  the multi-model compare view directly from the nav rail without going through
  the chat composer button.
- **Goal**: add a "模型对比 / Compare" tile to the nav grid between research and
  settings, using the `Icons.table` glyph and `openCompare()` action from the
  store. The tile shows as active when `view === 'compare'` (the CompareView
  calls `syncView('compare')` on mount).
- **Key decisions**: (1) expanded the grid from 6 to 7 tiles (4 rows, one partial
  row) — the 2-column grid layout handles odd counts gracefully. (2) placed Compare
  between Research and Settings so it groups with content-generation features.
