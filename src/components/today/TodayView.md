# src/components/today/TodayView.tsx

## Responsibility
"今日事项" reading surface: date header, a clearable active-filter chip (filtering itself is driven by the sidebar's TodayNav via the store), compact icon toolbar (timeline/list/card switch, "more" menu with collapse-all), grouped items (今天/本周) and the empty state.

## Dependencies
- Upstream: store, topics, TimelineCard, ReadRow, ReadCard
- Downstream: App

## Key notes
- Context awareness: a scroll listener (rAF-throttled) reports the first visible [data-cid] item to the store as the quick-chat "正在看" context.
- Non-essential actions are folded into the ⋯ menu per the "maximize reading area, no fixed header" iteration.

## Change history

### 2026-06-13 — remove the read/unread feature
- **Motivation**: user asked to drop read-state management entirely (the "全部读完了 / 还有 N 件未读" summary and all mark-as-read flows).
- **Change**: removed the unread summary line, the mark-all-read button and menu row, the scroll-past auto-read observer + toggle, the 'unread' filter branch and all `markRead` calls; the empty-state copy no longer implies reading progress.

### 2026-06-12 — removed the reading progress bar
- **Motivation**: user asked to remove the reading-progress UI; the
  "还有 N 件未读" summary next to the title already communicates progress.
- **Goal**: less chrome above the reading list.

### 2026-06-12 — created
- **Motivation**: PRD's second core surface — "see everything I need to care about today, mark read or auto-read".

### 2026-06-12 — filter moved to the store / sidebar
- **Motivation**: the Today page now keeps the sidebar (user request), and
  the new TodayNav there is the natural home for filtering; duplicate chip
  rows on the page would violate the minimalism rule.
- **Goal**: one shared `todayFilter` in the store; the toolbar only shows a
  single clearable chip when a filter is active.

### 2026-06-12 — unified content width across the three view modes
- **Motivation**: the timeline view wrapped each group in `.nb-tlwrap`
  (max-width 600px, centered) while list/card used the full 860px inner
  container, so switching views made group headers and content jump
  horizontally.
- **Goal**: stable layout when toggling timeline/list/card — all views now
  share the same `.nb-today-inner` column; the `.nb-tlwrap` rule was removed.

### 2026-06-12 — reserved a stable scrollbar gutter
- **Motivation**: even with equal column widths, switching views still moved
  the content when the OS shows classic scrollbars: the tall timeline view has
  a vertical scrollbar while the shorter list view doesn't, so the centered
  column shifted as the scrollbar appeared/disappeared.
- **Goal**: identical content position in all view modes —
  `scrollbar-gutter: stable` on `.nb-today` reserves the scrollbar space
  permanently.
