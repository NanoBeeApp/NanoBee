# src/components/today/TodayFilterBar.tsx

## Responsibility
Filter chips for the Today page toolbar: an "全部" chip plus one chip per topic (colored dot + short name + item count). Clicking a topic chip filters the reading list; clicking the active one again resets to "全部".

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
  which replaced the chat lists while reading — opening 今日事项 left no
  visible way back to a conversation. The sidebar now always keeps the chat
  lists, and filtering is a page-level concern, so it moved into the page.
- **Key decision**: chips in the existing toolbar row (reusing `.nb-fchip`)
  instead of an in-page left column — four topics fit one line and the
  reading area stays maximized.
