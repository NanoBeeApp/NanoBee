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
