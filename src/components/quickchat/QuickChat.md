# src/components/quickchat/QuickChat.tsx

## Responsibility
Docked right-hand chat panel, present on every non-chat surface (today / tasks / artifacts / research). Top-to-bottom: header (bee glyph + "快速对话" + "在聊天页打开" handoff once there are messages), context chip ("正在看 · …" with clear button), message feed reusing MessageView (or a centered empty state), composer.

## Dependencies
- Upstream: store, icons, MessageView, ThinkingIndicator
- Downstream: `_app` layout (rendered as the grid's third column; the layout adds `with-rightchat` to size it)

## Key notes
- Returns null on the chat view (centered bottom composer is the quick chat's "full form") and on the settings page (a configuration surface). The null-return and the layout's `with-rightchat` class share the same `view === 'chat' || view === 'settings'` condition so the grid column and the panel never disagree.
- The feed + composer are always visible while the panel is open (no more slide-up overlay / per-conversation expand toggle, so the `quickOpen` flag was dropped). A header `panelRight` button collapses the whole panel via `setRightCollapsed(true)`; FloatingControls re-opens it.
- Quick conversations get session metadata so they appear in the sidebar's "刚刚" group.

## Change history

### 2026-06-13 — also hidden on the /settings page
- **Motivation**: settings became its own route; the docked quick-chat panel
  should not appear on a configuration page.
- **Change**: the null-return guard now covers `view === 'settings'` too,
  matching the layout's `with-rightchat` condition.

### 2026-06-13 — docked right-hand panel (was floating composer + slide-up overlay)
- **Motivation**: the user asked that only the chat page keep the centered
  bottom composer; every other page should show a right sidebar with both the
  chat messages and the input.
- **Goal**: turn the global floating quick-chat into a persistent right column
  that stacks header → context chip → message feed → composer.
- **Key decisions**: dropped the slide-up overlay, the per-conversation
  expand/collapse chevron and the `quickOpen` store flag (the feed is always
  visible now); added a centered empty state for the pre-first-message panel;
  the "在聊天页打开" handoff stays (icon-only) and appears once the conversation
  has messages; a `panelRight` header button collapses the entire panel
  (`setRightCollapsed`), re-opened from FloatingControls' top-right control.

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
