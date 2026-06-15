# src/components/selection/SelectionFloat.tsx

## Responsibility
Text-selection float over AI replies: selecting ≥4 chars inside data-ai-text content shows `"设为提醒 / 设为任务"` ("Set as reminder / Set as task"), which creates a reminder task from the snippet.

## Dependencies
- Upstream: store, topics, ids, icons
- Downstream: App

## Key notes
- Owns its document-level mouseup listener and selection state; checks ancestors for data-ai-text so user bubbles/UI text never trigger it.

## Change history

### 2026-06-15 — "持续关注" (Keep watching) action
- **Motivation**: users should be able to select a snippet of AI text (e.g. a
  market note, news headline, topic) and turn it into a monitoring task via the
  NL→TriggerSpec compiler — without needing to retype the intent.
- **Change**: a "持续关注" button is added to the float. It calls `store.send`
  with `"帮我持续关注：<snippet>"` — the phrasing is designed to signal monitoring
  intent to the server-side compiler, which will attach a task-suggestion card to
  the AI reply. The snippet is capped at 80 chars to stay within the message limit.

### 2026-06-12 — created
- **Motivation**: PRD requirement for a one-click conversion of any AI-reply snippet into a task (third task-creation path).
