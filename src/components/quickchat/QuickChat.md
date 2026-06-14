# src/components/quickchat/QuickChat.tsx

## Responsibility
Customer-service-style floating quick-chat widget, present on every non-chat surface (today / tasks / artifacts / research). A launcher bubble pinned bottom-right; clicking it opens a popup chat panel above it. Popup, top-to-bottom: header (bee glyph + "快速对话" + "在聊天页打开" handoff once there are messages + close ×), context chip ("正在看 · …" with clear button), message feed reusing MessageView (or a centered empty state), composer. Styles live in `styles/quickchat.css` (`.nb-qc-bubble` / `.nb-qc-pop`); panel internals reuse the `.nb-rc-*` / `.nb-qc` styles from app.css.

## Dependencies
- Upstream: store, icons, MessageView, ThinkingIndicator, `styles/quickchat.css`
- Downstream: `_app` layout (rendered as a fixed-position overlay; the layout no longer reserves a grid column for it)

## Key notes
- Returns null on the chat view (centered bottom composer is the quick chat's "full form") and on the settings page (a configuration surface).
- Folded by default (`rightCollapsed` starts `true`): only the bubble shows. Clicking the bubble toggles `rightCollapsed`; while open (`!rightCollapsed`) the popup renders and stays open until the bubble or the header's `×` closes it (no auto-close on mouse leave). The bubble shows the bee icon when folded, `×` when open.
- **⌘J / Ctrl+J toggles the popup from anywhere**, and **Escape closes it when open** (the listener is inert on the chat / settings surfaces where the widget isn't rendered; it `preventDefault`s the browser's own ⌘J). The shortcut is surfaced to the user in two places: the bubble's hover tooltip (`快速对话 · ⌘J`) and a `⌘J` kbd chip in the popup header; the close button's tooltip notes `Esc`. Opening the popup (via the shortcut or a bubble click) auto-focuses the composer.
- The popup floats over content (fixed, bottom-right) instead of squeezing a grid column, so opening/closing it never reflows the page.
- The feed pins to the bottom on new messages, on the pending indicator, and whenever the popup (re)opens.
- Quick conversations get session metadata so they appear in the sidebar's "刚刚" group.

## Change history

### 2026-06-14 — Escape closes the popup
- **Motivation**: the user asked that Escape also dismiss the popup, matching the standard "close overlay" gesture.
- **Change**: the same widget `keydown` listener now closes the popup on `Escape` when it's open; the close button's tooltip notes `Esc`.

### 2026-06-14 — ⌘J keyboard shortcut + discoverability
- **Motivation**: the user asked for a simple keyboard shortcut to open the bottom-right quick-chat bubble, and a place to tell users about it.
- **Goal**: toggle the popup with ⌘J / Ctrl+J without a mouse, and make the binding discoverable rather than hidden.
- **Key decisions**: a `keydown` listener lives in the widget itself (co-located with toggle/focus, auto-guarded by the existing chat/settings `hidden` check) instead of the shell's ⌘N handler in `_app.tsx`; it `preventDefault`s so the browser's ⌘J (downloads) doesn't fire. The shortcut is announced via the bubble tooltip + an `⌘J` kbd chip in the popup header (styled to match the sidebar's existing `⌘N` chip). Opening now auto-focuses the composer.

### 2026-06-14 — customer-service widget (was docked right rail)
- **Motivation**: the user asked for a customer-service-style chat — a folded-by-default bubble that opens a popup which stays open, and re-clicking the bubble closes it.
- **Goal**: replace the docked, grid-column right rail with a floating launcher bubble + popup that overlays content.
- **Key decisions**: `rightCollapsed` now means "widget folded" and defaults to `true`; the bubble toggles it; the popup (`.nb-qc-pop`) and bubble (`.nb-qc-bubble`) are fixed-position (new `quickchat.css`), reusing the existing panel internals; the layout dropped the `with-rightchat` grid column and FloatingControls dropped its re-open button (the bubble replaces it).

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
