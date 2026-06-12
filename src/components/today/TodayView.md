# src/components/today/TodayView.tsx

## Responsibility
"今日事项" reading surface: date header + reading progress bar, filter chips (全部/未读/topics), compact icon toolbar (mark-all-read, timeline/list/card switch, "more" menu with scroll-past auto-read toggle), grouped items (今天/本周) and the all-done state.

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
