# src/components/today/TimelineCard.tsx

## Responsibility
Tweet-style timeline card (Today default view): round topic-color avatar, NanoBee + topic badge + time header, full body, optional trend sparkline, light action row. Unread cards get amber tint + dot.

## Dependencies
- Upstream: types, topics, icons, Sparkline
- Downstream: TodayView

## Key notes
- data-cid / data-rid attributes feed the viewing-context tracker and scroll-past auto-read observer in TodayView.

## Change history

### 2026-06-12 — created
- **Motivation**: user iteration "今日事项支持像 twitter 卡片那样的 timeline 视图" — full text visible without clicking.
