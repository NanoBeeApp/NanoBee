# src/components/selection/SelectionFloat.tsx

## Responsibility
Text-selection float over AI replies: selecting ≥4 chars inside data-ai-text content shows `"设为提醒 / 设为任务"` ("Set as reminder / Set as task"), which creates a reminder task from the snippet.

## Dependencies
- Upstream: store, topics, ids, icons
- Downstream: App

## Key notes
- Owns its document-level mouseup listener and selection state; checks ancestors for data-ai-text so user bubbles/UI text never trigger it.

## Change history

### 2026-06-12 — created
- **Motivation**: PRD requirement for a one-click conversion of any AI-reply snippet into a task (third task-creation path).
