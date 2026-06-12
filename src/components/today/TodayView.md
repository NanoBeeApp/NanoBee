# src/components/today/TodayView.tsx

## Responsibility
"今日事项" reading surface: date header + reading progress bar, a clearable active-filter chip (filtering itself is driven by the sidebar's TodayNav via the store), compact icon toolbar (mark-all-read, timeline/list/card switch, "more" menu with scroll-past auto-read toggle), grouped items (今天/本周) and the all-done state.

## Dependencies
- Upstream: store, topics, Toggle, TimelineCard, ReadRow, ReadCard
- Downstream: App

## Key notes
- Context awareness: a scroll listener (rAF-throttled) reports the first visible [data-cid] item to the store as the quick-chat "正在看" context.
- Scroll-past auto-read: an IntersectionObserver marks [data-rid] items read once they leave above the viewport (toggleable, default on).
- Non-essential actions are folded into the ⋯ menu per the "maximize reading area, no fixed header" iteration.

## Change history

### 2026-06-12 — created
- **Motivation**: PRD's second core surface — "see everything I need to care about today, mark read or auto-read".

### 2026-06-12 — filter moved to the store / sidebar
- **Motivation**: the Today page now keeps the sidebar (user request), and
  the new TodayNav there is the natural home for filtering; duplicate chip
  rows on the page would violate the minimalism rule.
- **Goal**: one shared `todayFilter` in the store; the toolbar only shows a
  single clearable chip when a filter is active.
