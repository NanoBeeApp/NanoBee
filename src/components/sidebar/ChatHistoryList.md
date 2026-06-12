# src/components/sidebar/ChatHistoryList.tsx

## Responsibility
ChatGPT-style flat history: session ("刚刚") chats on top, then time-grouped seeded chats; pinned chats show a star, others a topic-color dot.

## Dependencies
- Upstream: data/chats, data/topics, icons
- Downstream: Sidebar

## Change history

### 2026-06-12 — created
- **Motivation**: split from Sidebar per one-component-per-file convention; renders the design's default sidebar view.
