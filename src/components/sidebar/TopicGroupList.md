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

### 2026-06-15 — only render topics that have chats or tasks; add empty-state hint
- **Motivation**: remove all demo/seed data and hardcoded fixed data so the app starts empty; previously all four taxonomy topics were always rendered as topic group cards even when the user had zero content, showing four empty rows on a fresh account.
- `TOPICS` is now filtered to `activeTopics` — only topics where the user has at least one chat or task.
- When `activeTopics` is empty, a single `.nb-topic-empty` hint is shown: "还没有话题，开始对话后会自动归类" (no topics yet — they will be grouped automatically once you start a conversation).
- No behavior change once the user has real content.
