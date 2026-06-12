# src/types.ts

## Responsibility
Shared domain types: Topic, Task, UpdateItem, chat message union (user / ai / proactive), message extras (price, recommended actions, task suggestion), toasts and the quick-chat viewing context.

## Key exports
All interfaces/types listed above plus `IconName`.

## Dependencies
- Upstream: none
- Downstream: data layer, store, all components

## Key notes
- `AiMessage.role = 'proactive'` marks AI-initiated messages — they render as amber emphasized cards (confirmed design default).
- `Paragraph` is an array of inline segments (string | bold | mono number | citation) mirroring the prototype's data-driven rich text.

## Change history

### 2026-06-12 — created
- **Motivation**: the prototype passed untyped JS objects; porting to strict TS needed a precise model of message/task/update shapes.

### 2026-06-12 — extended `IconName` with `logout`
- **Motivation**: the sidebar account menu got a dedicated sign-out icon
  (replacing the ambiguous `x`), which required a new union member.
