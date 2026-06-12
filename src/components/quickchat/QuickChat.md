# src/components/quickchat/QuickChat.tsx

## Responsibility
Global floating composer (every non-chat surface) + slide-up quick-chat overlay: context chip ("正在看 · …" with clear button), message feed reusing MessageView, "在聊天页打开" handoff, collapse/expand.

## Dependencies
- Upstream: store, icons, MessageView, ThinkingIndicator
- Downstream: App

## Key notes
- Returns null on the chat view — the main composer is the quick chat's "full form".
- Quick conversations get session metadata so they appear in the sidebar's "刚刚" group.

## Change history

### 2026-06-12 — created
- **Motivation**: user iteration "这个浮动输入框和聊天弹出是全局的，任何地方都要有；AI 要知道用户正在看的内容".

### 2026-06-12 — created-state from persisted tasks
- **Motivation**: same reload issue as ChatView — suggestion cards in the
  quick-chat overlay now treat ids present in the persisted task list as
  already created.

### 2026-06-12 — focus & keyboard fixes
- **Motivation**: UI-detail review — focus was lost after clicking send or "展开对话", and the overlay had no keyboard way to collapse.
- **Changes**: refocus the input after a button-click send; Escape collapses the overlay; expanding via the chevron keeps focus in the input.

### 2026-06-12 — drop task-card plumbing
- **Motivation**: MessageView became text-only; removed the createdTaskIds/createTask wiring and the knownTaskIds memo.
