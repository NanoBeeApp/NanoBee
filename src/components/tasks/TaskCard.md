# src/components/tasks/TaskCard.tsx

## Responsibility
One task card: icon (schedule/condition), title, on/off toggle, trigger line, latest-result box with tone dot, and next-run footer. Paused cards are dimmed.

## Dependencies
- Upstream: types (Task), icons, Toggle
- Downstream: TaskRail

## Change history

### 2026-06-12 — created
- **Motivation**: PRD requires task running state to be visible at a glance (监控中/已暂停/最近一次结果).
