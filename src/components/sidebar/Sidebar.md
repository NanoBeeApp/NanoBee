# src/components/sidebar/Sidebar.tsx

## Responsibility
Left rail: brand row with collapse button, "新对话" (⌘N), the amber "今日事项" inbox entry, the "任务" entry (opens the full-page task center) with an active-task count, and the chat lists (history/topics switch) shown on every view, plus the account footer.

## Dependencies
- Upstream: store, AccountFoot, ChatHistoryList, TopicGroupList, icons
- Downstream: App

## Change history

### 2026-06-13 — auto-close the temporary peek on pointer leave
- **Motivation**: the new edge-reveal "peek" opens the sidebar as a temporary
  overlay; it needs to close itself once the user moves away, otherwise it would
  linger like a pinned sidebar.
- **Goal**: the rail collapses again as soon as the pointer leaves it (unless it
  was pinned open via the panel icon).
- **Change**: added `onMouseLeave={endPeek}` to the `<aside>`. `endPeek` is a
  no-op when not peeking, so it is safe to attach unconditionally.

### 2026-06-13 — Arc-style two-column nav grid
- **Motivation**: the four navigation entries (今日事项 / 任务 / 动态卡片 /
  研究画布) were stacked as full-width rows, eating vertical space and pushing
  the chat list down. The user wanted the Arc browser sidebar look.
- **Goal**: lay the four entries out as a compact 2×2 grid of tiles.
- **Change**: wrapped them in `.nb-nav-grid` and replaced the per-entry
  classes (`nb-inbox-entry` / `nb-tasks-entry`) with a single unified
  `nb-nav-tile` (icon top-left, label bottom-left, count badge floated
  top-right). All four share the amber soft style for a cohesive grid; the
  active tile keeps the amber border + glow ring.

### 2026-06-13 — chat lists stay visible on the Today page (TodayNav removed)
- **Motivation**: opening 今日事项 swapped the sidebar body for TodayNav, so the
  chat lists vanished and the only obvious way back was "新对话" — the
  "返回聊天" row was buried at the bottom of the filters. The Tasks page already
  kept the chat lists, so Today was also inconsistent.
- **Goal**: the sidebar is stable global navigation — clicking any chat (or the
  history/topics switch) works from every view, so no dedicated back button is
  needed. The Today filters moved into the page itself (`TodayFilterBar`).
- **Change**: dropped the `TodayNav` branch and the `isToday` special-casing;
  `TodayNav.tsx` deleted.

### 2026-06-13 — remove the read/unread feature
- **Motivation**: user asked to drop read-state management entirely.
- **Change**: the 今日事项 entry no longer shows an unread-count badge.

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

### 2026-06-13 — Artifacts nav entry
- **Motivation**: the standalone "动态卡片" page was replaced by the
  chat-triggered Artifacts page.
- **Goal**: the nav tile now opens the Artifacts view (`openArtifacts()`,
  testid `artifacts-entry`, label "Artifacts") instead of the cards view.
