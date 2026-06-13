# src/components/sidebar/TodayNavList.tsx

## Responsibility
The sidebar scroll-area list shown while the app is on the "今日事项" page. A
compact, scannable index of today's proactive updates, grouped 今天 / 本周 to
mirror the reading surface. Clicking an entry scrolls the reading surface to
that item.

## Core export / API
- `TodayNavList()` — self-contained; reads `updates`, `todayFilter`,
  `setTodayFilter`, `focusItem` from `useAppStore`.

## Dependencies
- Upstream: `useAppStore`, icons
- Downstream: `Sidebar` (rendered when `view === 'today'`)

## Key implementation notes
- Click handler `jumpTo(topicId, id)` first clears the topic filter to `'all'`
  when the clicked item is filtered out (otherwise it would not exist in the
  DOM), then calls `focusItem(id)`. `TodayView` watches `focusItemId` /
  `focusItemTick` and scrolls the matching `[data-cid]` element into view.
- Renders nothing but an empty-state line when there are no updates.

## Change history

### 2026-06-13 — created
- **Motivation**: the user asked that each page's sidebar list show the list
  that belongs to that page; on 今日事项 the sidebar should index today's items
  instead of the chat history.
- **Goal**: a quiet, jump-to index of today's items that keeps the reading
  surface as the place to actually read.
- **Key decision**: reuse the existing `.nb-item` list style and the store's
  generic `focusItem` scroll mechanism rather than inventing a per-page one.
