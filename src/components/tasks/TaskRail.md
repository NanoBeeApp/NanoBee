# src/components/tasks/TaskRail.tsx

## Responsibility
Right rail: dark live-monitor card for the gold topic, topic-scoped task list (all tasks when no topic), empty-state nudge and "新建任务" button.

## Dependencies
- Upstream: store, topics, TaskCard, icons
- Downstream: App

## Key notes
- Monitor card shows for the gold topic (design default "显示实时监控卡" = on).
- A just-created task flashes in via the nbtoast animation.

## Change history

### 2026-06-12 — created
- **Motivation**: design handoff; tasks live in a contextual rail so chat stays clean.
