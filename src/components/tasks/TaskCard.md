# src/components/tasks/TaskCard.tsx

## Responsibility
One task card: icon (schedule/condition), title, on/off toggle, trigger line, latest-result box with tone dot, and next-run footer. Paused cards are dimmed.

## Dependencies
- Upstream: types (Task), icons, Toggle
- Downstream: TasksView

## Change history

### 2026-06-12 — created
- **Motivation**: PRD requires task running state to be visible at a glance (监控中/已暂停/最近一次结果).

### 2026-06-12 — consumer changed
- **Motivation**: the right rail was removed; the card is now rendered by the
  full-page TasksView grid. No visual change to the card itself.
