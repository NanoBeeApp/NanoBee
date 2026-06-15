# src/components/today/TimelineCard.tsx

## Responsibility
Tweet-style timeline row (Today default view): round topic-color avatar, NanoBee + time header, full body, optional trend sparkline. Rendered as a flat list separated only by hairline dividers.

## Dependencies
- Upstream: types, icons, Sparkline
- Downstream: TodayView

## Key notes
- The data-cid attribute feeds the viewing-context tracker in TodayView.

## Change history

### 2026-06-12 — created
- **Motivation**: user iteration "今日事项支持像 twitter 卡片那样的 timeline 视图" (Today items should support a Twitter-card-style timeline view) — full text visible without clicking.

### 2026-06-12 — declutter
- **Motivation**: user asked to drop the topic tag from the card and make the action row icon-only (no labels).
- **Change**: removed the topic badge from the header; action buttons now render icons only as 32px circular hit-targets with title/aria-label tooltips.

### 2026-06-12 — flatten to Twitter-style timeline
- **Motivation**: user wants the timeline to look like Twitter — items separated by faint dividers only, nothing that pulls visual attention.
- **Change**: dropped the per-item card box (border, radius, shadow, bottom margin) and the unread amber gradient/border background; rows now sit in a flat list divided by a single `var(--border)` hairline with a subtle `surface-2` hover. Unread state is conveyed only by the existing amber dot. Sparkline inset lost its border in favour of a plain `surface-2` fill.

### 2026-06-12 — drop the action icon row
- **Motivation**: user asked to remove the three trailing action icons (open-chat / mark-read / save-later) — they added visual noise to the otherwise quiet feed.
- **Change**: removed the `.tl-actions` row entirely (and its CSS). To keep the primary "open in chat" affordance, the whole row was briefly made the click target (`role="button"`, Enter/Space). Mark-read still happens automatically via the scroll-past observer in TodayView, so no per-row read button is needed.

### 2026-06-13 — drop the source line
- **Motivation**: user asked to remove the "来源 · …" (Source · …) source attribution line from each row — it added a trailing line of low-value metadata to the quiet feed.
- **Change**: removed the `item.source` `.src-line` render from the timeline row. The source is still carried on the item data and shown in the list/card views via ReadBody; only the timeline drops it.

### 2026-06-13 — remove the read/unread feature
- **Motivation**: user asked to drop read-state management entirely (no unread dots, no mark-as-read).
- **Change**: removed the unread/read CSS classes, the amber `tl-dot` and the `data-rid` auto-read anchor; the props interface no longer extends `ReadItemActions`.

### 2026-06-12 — drop the row-level click handler
- **Motivation**: user followed up with "不要整行点击" (don't make the whole row clickable) — the timeline should be a purely read-only feed with no row interaction.
- **Change**: removed the `role="button"` / `tabIndex` / `onClick` / `onKeyDown` from the row and the `cursor: pointer` + `:hover` background from `.nb-tl-card`. The component now renders item data only; neither `onOpenChat` nor `onToggleRead` is consumed here (both stay on the shared `ReadItemActions` interface for list/card views).
