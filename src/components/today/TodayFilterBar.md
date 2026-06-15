# src/components/today/TodayFilterBar.tsx

## Responsibility
Filter chips for the Today page toolbar: an "全部" (All) chip plus one chip per topic (colored dot + short name + item count). Clicking a topic chip filters the reading list; clicking the active one again resets to "全部".

## Core exports
- `TodayFilterBar` — reads `updates` / `todayFilter` / `setTodayFilter` from the store; renders `.nb-fchips` with `.nb-fchip` buttons.

## Dependencies
- Upstream: store, topics
- Downstream: TodayView (rendered inside `.nb-read-toolbar`)

## Key notes
- The filter state stays in the store (`todayFilter`) so other surfaces (e.g. quick chat context) keep working unchanged.

## Change history

### 2026-06-13 — created
- **Motivation**: the Today filters used to live in the sidebar (TodayNav),
  which replaced the chat lists while reading — opening the Today page left no
  visible way back to a conversation. The sidebar now always keeps the chat
  lists, and filtering is a page-level concern, so it moved into the page.
- **Key decision**: chips in the existing toolbar row (reusing `.nb-fchip`)
  instead of an in-page left column — four topics fit one line and the
  reading area stays maximized.

### 2026-06-15 — only show topic chips for topics that have updates
- **Motivation**: remove all demo/seed data and hardcoded fixed data so the app starts empty; previously all four taxonomy topics were always rendered as chips regardless of whether any updates existed for them.
- `TOPICS` is now filtered by `updates.some(u => u.topicId === t.id)` before mapping to chips.
- An empty Today page (zero updates) shows only the "全部" (All) chip — no phantom topic chips for content that doesn't exist yet.
