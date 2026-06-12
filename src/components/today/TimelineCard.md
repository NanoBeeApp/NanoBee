# src/components/today/TimelineCard.tsx

## Responsibility
Tweet-style timeline row (Today default view): round topic-color avatar, NanoBee + time header, full body, optional trend sparkline, icon-only action row. Rendered as a flat list separated only by hairline dividers; unread items are marked solely by a small amber dot.

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

### 2026-06-12 — flatten to Twitter-style timeline
- **Motivation**: user wants the timeline to look like Twitter — items separated by faint dividers only, nothing that pulls visual attention.
- **Change**: dropped the per-item card box (border, radius, shadow, bottom margin) and the unread amber gradient/border background; rows now sit in a flat list divided by a single `var(--border)` hairline with a subtle `surface-2` hover. Unread state is conveyed only by the existing amber dot. Sparkline inset lost its border in favour of a plain `surface-2` fill.

### 2026-06-12 — drop the action icon row
- **Motivation**: user asked to remove the three trailing action icons (open-chat / mark-read / save-later) — they added visual noise to the otherwise quiet feed.
- **Change**: removed the `.tl-actions` row entirely (and its CSS). To keep the primary "open in chat" affordance, the whole row was briefly made the click target (`role="button"`, Enter/Space). Mark-read still happens automatically via the scroll-past observer in TodayView, so no per-row read button is needed.

### 2026-06-12 — drop the row-level click handler
- **Motivation**: user followed up with "不要整行点击" — the timeline should be a purely read-only feed with no row interaction.
- **Change**: removed the `role="button"` / `tabIndex` / `onClick` / `onKeyDown` from the row and the `cursor: pointer` + `:hover` background from `.nb-tl-card`. The component now renders item data only; neither `onOpenChat` nor `onToggleRead` is consumed here (both stay on the shared `ReadItemActions` interface for list/card views).
