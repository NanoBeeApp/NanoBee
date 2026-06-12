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

### 2026-06-12 — removed all leading icons
- **Motivation**: user asked to strip the icons on the left of topic groups; matches the minimalist title-only direction already applied to the chat history list.
- **Decision**: dropped the colored topic icon box and the per-row chat/task icons (text + count + chevron remain); related CSS rules (`.nb-topic-ico`, `.nb-sub-item .ic`) removed.
