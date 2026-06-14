# src/components/chat/ChatView.tsx

## Responsibility
Center chat surface: auto-scrolling message feed, pending indicator, composer, and the empty state for new chats.

## Dependencies
- Upstream: store, MessageView, ThinkingIndicator, Composer, EmptyState
- Downstream: App

## Change history

### 2026-06-15 — drop the `topic` / `showQuick` plumbing for Composer
- **Motivation**: the Composer's quick-suggestion chip row was removed, so the only reason this view computed `topic` (to pick a chip variant) and passed `showQuick={false}` in the empty state was gone.
- **Change**: removed the `activeTopicId` subscription, the `topicById` import, and the `topic` local; both Composer renders now pass only `onSend`.

### 2026-06-12 — created
- **Motivation**: design handoff; isolates feed scrolling behavior from the App shell.

### 2026-06-12 — created-state from persisted tasks
- **Motivation**: after a reload, a confirmed suggestion card showed "创建任务"
  again because `createdTaskIds` is session memory. The card now also counts a
  suggestion as created when its id exists in the persisted task list.

### 2026-06-12 — pass `showQuick={false}` to Composer in empty state
- **Motivation**: the welcome screen already shows four guide cards; the three quick-suggestion chips below the composer repeat the same actions and clutter the screen.
- **Goal**: eliminate the redundancy so the welcome page is cleaner and the guide cards get undivided attention.
- **Key decision**: pass `showQuick={false}` only in the empty-state branch; the active-conversation branch keeps `showQuick` at its default (`true`) so chips still appear once a chat is started.

### 2026-06-12 — drop task-card plumbing
- **Motivation**: MessageView became text-only, so the createdTaskIds/createTask/onSuggest wiring had no consumer.
- **Goal**: pass only the message to MessageView; remove the knownTaskIds memo.

### 2026-06-14 — scroll to the question, not the bottom
- **Motivation**: with streamed replies, the old "pin to bottom on every
  message-count change" forced the view to the tail, so a long answer had to be
  scrolled back up to read from the start.
- **Goal**: when a question is sent (last message is the user's, no reply yet),
  pin THAT question near the top (`FEED_TOP_PAD`) so the reply streams in below
  and reads top-down; do not auto-follow while it streams; opening an existing
  chat from history still jumps to the latest message.
- **Key decision**: drive it off the last user-message id changing (tracked via
  refs) rather than `messages.length`/`pending`; locate the question by
  `[data-msg-id]` and measure with `getBoundingClientRect` (offsetParent-safe).
