# src/components/sidebar/TodayNav.tsx

## Responsibility
Sidebar body shown while the Today page is open: a reading-progress card
(read/total + progress bar), the shared filter (全部 / 未读 / per-topic rows
with amber unread badges) and quick actions (mark all read, back to chat).

## Core exports
- `TodayNav` — self-contained (reads the store directly, no props).

## Dependencies
- Upstream: `useAppStore` (`updates`, `todayFilter`, `setTodayFilter`,
  `markAllRead`, `backToChat`), `TOPICS`, icons
- Downstream: `Sidebar` (rendered in the scroll area when `view === 'today'`)

## Key implementation notes
- Filtering state lives in the store (`todayFilter`) so this nav and the
  Today reading surface stay in sync; clicking the active topic again resets
  the filter to `'all'`.
- Unread badges reuse the amber inbox-count language; topics with no unread
  show their total in muted mono instead.

## Change history

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
