# src/components/today/TimelineCard.tsx

## Responsibility
Tweet-style timeline card (Today default view): round topic-color avatar, NanoBee + time header, full body, optional trend sparkline, icon-only action row. Unread cards get amber tint + dot.

## Dependencies
- Upstream: types, icons, Sparkline
- Downstream: TodayView

## Key notes
- data-cid / data-rid attributes feed the viewing-context tracker and scroll-past auto-read observer in TodayView.

## Change history

### 2026-06-12 — created
- **Motivation**: user iteration "今日事项支持像 twitter 卡片那样的 timeline 视图" — full text visible without clicking.

### 2026-06-12 — declutter
- **Motivation**: user asked to drop the topic tag from the card and make the action row icon-only (no labels).
- **Change**: removed the topic badge from the header; action buttons now render icons only as 32px circular hit-targets with title/aria-label tooltips.
