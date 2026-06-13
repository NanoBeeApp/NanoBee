# src/components/sidebar/TodayNav.tsx

## Responsibility
Sidebar body shown while the Today page is open: the shared filter (全部 /
per-topic rows with item counts) and quick actions (back to chat).

## Core exports
- `TodayNav` — self-contained (reads the store directly, no props).

## Dependencies
- Upstream: `useAppStore` (`updates`, `todayFilter`, `setTodayFilter`,
  `backToChat`), `TOPICS`, icons
- Downstream: `Sidebar` (rendered in the scroll area when `view === 'today'`)

## Key implementation notes
- Filtering state lives in the store (`todayFilter`) so this nav and the
  Today reading surface stay in sync; clicking the active topic again resets
  the filter to `'all'`.

## Change history

### 2026-06-13 — remove the read/unread feature
- **Motivation**: user asked to drop read-state management entirely.
- **Change**: removed the 未读 filter row, the amber per-topic unread badges
  (rows now show their total count) and the mark-all-read action.

### 2026-06-12 — removed the reading-progress card
- **Motivation**: user asked to drop the reading-progress UI; the unread
  summary on the page header already conveys remaining work, so the card was
  redundant chrome in the sidebar.
- **Goal**: leaner nav — filters and actions only.

### 2026-06-12 — created
- **Motivation**: the Today page used to hide the sidebar entirely
  (immersive mode), leaving navigation to floating corner buttons; the user
  asked for the sidebar to stay on the Today page with useful features.
- **Goal**: give the sidebar a reading-oriented body on the Today page
  (Inoreader-style feed nav) instead of the chat lists, which are not
  relevant while reading.
- **Key decision**: lift the filter from TodayView local state into the
  store so one source of truth drives both the sidebar nav and the page
  toolbar chip.
