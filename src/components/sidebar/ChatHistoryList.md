# src/components/sidebar/ChatHistoryList.tsx

## Responsibility
ChatGPT-style flat history: session ("刚刚") chats on top, then time-grouped chats. Each row shows only the title — no leading icon, no subtext.

## Dependencies
- Upstream: types (ChatMeta, SessionMeta)
- Downstream: Sidebar

## Key notes
- Chats arrive via the `chats` prop (server-loaded through the store), not the static demo module; chats created in past sessions land in "今天" after a reload.
- Session ids are filtered out of the grouped lists so a chat never renders twice if the store re-bootstraps mid-session.

## Change history

### 2026-06-12 — created
- **Motivation**: split from Sidebar per one-component-per-file convention; renders the design's default sidebar view.

### 2026-06-12 — server-backed chats
- **Motivation**: the list read the static CHATS module, so persisted chats from D1 never appeared; it now renders the store's chats prop.

### 2026-06-12 — drop the leading topic-color dots
- **Motivation**: on the new white sidebar the per-item topic-color dots read as random yellow specks and added visual noise; removed them so titles align flat. The pinned star stays as the only leading marker, and the now-unused topics import was dropped.

### 2026-06-12 — title-only rows (no icon, no subtext)
- **Motivation**: user wanted the history list as clean as possible. Removed the pinned star (the last remaining icon, plus its icons import) and the `.sub` description line ("快速对话" / per-chat subtitle) so each row renders just the title.

### 2026-06-15 — remove `data/chats` dependency; inline the group-label const
- **Motivation**: remove all demo/seed data and hardcoded fixed data so the app starts empty and is driven by real use; `data/chats.ts` (which contained `CHAT_HISTORY_GROUPS` alongside demo chat fixtures) was deleted.
- The `CHAT_HISTORY_GROUPS` array `['今天', '昨天', '近 7 天']` is now a module-level const inside this file — it is not demo data (these are time-bucket labels set by the server), just a layout constant.
- No behavior change; the import line is gone and the const is self-contained.
