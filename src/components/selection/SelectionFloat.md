# src/components/selection/SelectionFloat.tsx

## Responsibility
Text-selection float over AI replies: selecting ≥4 chars inside data-ai-text content shows "设为提醒 / 设为任务", which creates a reminder task from the snippet.

## Dependencies
- Upstream: store, topics, ids, icons
- Downstream: App

## Key notes
- Owns its document-level mouseup listener and selection state; checks ancestors for data-ai-text so user bubbles/UI text never trigger it.

## Change history

### 2026-06-12 — created
- **Motivation**: PRD requirement "针对 AI 回复的某段内容一键转化为任务" (third task-creation path).
