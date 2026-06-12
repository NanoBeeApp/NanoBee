# src/components/chat/TaskSuggestCard.tsx

## Responsibility
Task proposal card in an AI reply — the primary create-task-from-chat flow. Config is collapsed into chips; "创建任务" confirms; created state shows a disabled check button.

## Dependencies
- Upstream: types (TaskSuggestion), icons
- Downstream: MessageView (extra kind 'task'), QuickChat overlay

## Change history

### 2026-06-12 — created
- **Motivation**: core PRD requirement "create tasks through conversation, complexity hidden by default".
