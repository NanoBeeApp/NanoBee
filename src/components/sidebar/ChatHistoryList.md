# src/components/sidebar/ChatHistoryList.tsx

## Responsibility
ChatGPT-style flat history: session ("刚刚") chats on top, then time-grouped chats; pinned chats show a star, others a topic-color dot.

## Dependencies
- Upstream: data/chats (group labels), data/topics, types (ChatMeta), icons
- Downstream: Sidebar

## Key notes
- Chats arrive via the `chats` prop (server-loaded through the store), not the static demo module; chats created in past sessions land in "今天" after a reload.
- Session ids are filtered out of the grouped lists so a chat never renders twice if the store re-bootstraps mid-session.

## Change history

### 2026-06-12 — created
- **Motivation**: split from Sidebar per one-component-per-file convention; renders the design's default sidebar view.

### 2026-06-12 — server-backed chats
- **Motivation**: the list read the static CHATS module, so persisted chats from D1 never appeared; it now renders the store's chats prop.
