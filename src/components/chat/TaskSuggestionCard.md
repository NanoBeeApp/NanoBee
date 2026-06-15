# TaskSuggestionCard.tsx

**Purpose**: Inline task-suggestion card rendered below an AI reply when the
NL→TriggerSpec compiler (`src/worker/agent/task-compiler.ts`) detected a
monitoring or scheduling intent in the user's message.

The card is rendered by `MessageView.tsx` when the `AiMessage` carries a
`taskSuggestion` field and streaming is complete. It shows:

- The proposed task title + trigger label (amber framing, same family as proactive cards).
- A "创建监控任务" CTA that calls `store.createTask` → `POST /api/tasks` with the
  embedded `triggerSpec` (idempotent via the pre-generated `taskId`).
- A dismiss button that hides the card locally (the persisted message is unchanged).

Already-created state is detected via `store.createdTaskIds` so the card
permanently shows "已创建" even after reloads within the same session.

## Change history & rationale

- **2026-06-15** — Initial implementation. Part of the NL→TriggerSpec task-creation
  loop (compiler → suggestion card → task creation → cron engine picks it up).
- **2026-06-15** — Removed unused `nextId` import (task id comes from `suggestion.taskId`, not generated here); fixes TS6133 error.
