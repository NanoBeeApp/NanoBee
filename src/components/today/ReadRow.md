# src/components/today/ReadRow.tsx

## Responsibility
Compact list row (icon, title, summary, time, chevron) that expands inline to ReadBody.

## Dependencies
- Upstream: types, icons, ReadBody
- Downstream: TodayView

## Change history

### 2026-06-13 — remove the read/unread feature
- **Motivation**: user asked to drop read-state management entirely.
- **Change**: removed the unread dot (`udot`), the read/unread row classes, the `data-rid` auto-read anchor and the `onToggleRead` prop; expanding no longer marks anything read.

### 2026-06-12 — created
- **Motivation**: the Inoreader-style "scan fast, open what matters" reading mode.
