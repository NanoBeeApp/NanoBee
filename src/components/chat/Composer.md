# src/components/chat/Composer.tsx

## Responsibility
Main chat composer: auto-growing textarea, contextual quick-suggestion chips, slash (/任务 /提醒 /盯盘 /早报) and mention (@) popovers, toolbar (attach / slash / voice / model) and send button.

## Dependencies
- Upstream: types (Topic), icons
- Downstream: ChatView

## Key notes
- Popover triggers mirror the prototype: exact "/" opens slash, trailing "@" opens mentions, Escape closes.
- Enter sends, Shift+Enter adds a newline.

## Change history

### 2026-06-12 — created
- **Motivation**: PRD requires full ChatGPT-style chat plus task creation entry points in the composer.

### 2026-06-12 — focus & popover interaction fixes
- **Motivation**: user feedback — clicking "新对话" left the input unfocused; small interaction papercuts surfaced during a UI-detail review.
- **Changes**: auto-focus the textarea on mount and whenever `activeChatId` changes; refocus after clicking the send button; the toolbar "/" button now toggles the popover and focuses the input; the slash popover only stays open while the text still looks like a command being typed (starts with "/", no space) instead of whenever "/" appears anywhere.
