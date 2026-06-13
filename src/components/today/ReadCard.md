# src/components/today/ReadCard.tsx

## Responsibility
Grid card variant; expands to full grid width with ReadBody and a collapse button.

## Dependencies
- Upstream: types, topics, icons, ReadBody
- Downstream: TodayView

## Change history

### 2026-06-13 — remove the read/unread feature
- **Motivation**: user asked to drop read-state management entirely.
- **Change**: removed the unread amber tint, the corner dot (`cdot`), the read/unread card classes, the `data-rid` auto-read anchor and the `onToggleRead` prop.

### 2026-06-12 — created
- **Motivation**: card view alternative for visual scanners; same expand-to-read semantics as the list.
