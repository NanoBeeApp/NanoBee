# src/data/updates.ts

## Responsibility
Initial proactive updates (Today page reading items + bell dropdown), and UPDATE_TO_CHAT — the topic→conversation mapping used by "打开对话".

## Dependencies
- Upstream: src/types
- Downstream: store (initial state + openUpdateInChat)

## Change history

### 2026-06-12 — created
- **Motivation**: design handoff demo content; bodies are structured (paragraphs + bullet lists) so the three Today views can all render the same data.
