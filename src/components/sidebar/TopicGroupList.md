# src/components/sidebar/TopicGroupList.tsx

## Responsibility
Topic-group sidebar view: collapsible topic cards listing conversations and tasks (with status dot/badge); header counts chats·tasks.

## Dependencies
- Upstream: data/topics, types (ChatMeta, Task), icons
- Downstream: Sidebar

## Change history

### 2026-06-12 — created
- **Motivation**: PRD's "AI auto-managed topics" — same data, alternate organization, one tap away.

### 2026-06-12 — server-backed chats
- **Motivation**: same as ChatHistoryList — topic cards now group the store's server-loaded chats instead of the static demo module, so new chats are counted and listed under their AI-assigned topic.
