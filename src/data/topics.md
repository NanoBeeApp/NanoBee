# src/data/topics.ts

## Responsibility
Topic taxonomy (gold / education / brief / health) — the four categories the agent auto-classifies chats and tasks into (see `worker/reply.ts detectTopic`). This is app configuration that drives classification, filtering and UI tinting, not demo data. The file also exports `topicById` and `topicShortName` helpers.

## Core exports
- `TOPICS: Topic[]` — the four taxonomy entries (id, name, icon, color, soft)
- `topicById(id)` — look up a topic by id (used by ChatView, store, etc.)
- `topicShortName(t)` — text before the " · " separator (used by filter chips)

## Dependencies
- Upstream: `src/types` (Topic)
- Downstream: `worker/reply.ts` (detectTopic classification), sidebar views (ChatHistoryList, TopicGroupList), TodayFilterBar, TasksView, store (topic ids as defaults)

## Change history

### 2026-06-12 — created
- **Motivation**: topic colors drive avatar/badge tinting across all surfaces and the agent uses the ids for auto-classification; a single source of truth avoids drift.

### 2026-06-15 — reframed as taxonomy (app config), not demo data
- **Motivation**: the broader "remove all demo/seed data" cleanup deleted the sibling demo modules (`data/chats.ts`, `data/updates.ts`, `data/tasks.ts`, `data/conversations.ts`). This file was intentionally kept because its content is application configuration — the topic ids and colors are referenced by the agent classifier and UI components, not seeded as fake user content.
- No code changes; only the framing in documentation updated to distinguish taxonomy config from demo data.
