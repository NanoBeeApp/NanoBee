# src/components/today/TodayEmptyState.tsx

## Purpose

Richer empty state for the Today feed, rendered by `TodayView` when
`filtered.length === 0`. Replaces the previous one-line "这里暂时是空的" placeholder.

Three variants based on context:

| Condition | Variant | Message |
|-----------|---------|---------|
| `hasFilter === true` | Filtered empty | A filter is active but nothing matches; suggests switching to "全部". |
| `tasks.length > 0 && !hasFilter` | Waiting | Tasks exist but haven't fired yet; explains the scheduler and offers a "查看我的任务" link. |
| `tasks.length === 0 && !hasFilter` | New user | No tasks at all; explains what the feed is and CTA to create the first task. |

## Design

- Extends the existing `.nb-alldone` style for structural consistency.
- Adds `.nb-today-empty` modifier for the bee icon background and CTA button.
- Honey/amber primary CTA (`--nb-honey`) on the "new user" variant.
- Ghost CTA for the "waiting" variant.

## Change history

- 2026-06-15  Initial implementation.
