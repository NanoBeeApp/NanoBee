# src/types.ts

## Responsibility
Shared domain types: Topic, Task, UpdateItem, chat message union (user / ai / proactive), task suggestions, toasts and the quick-chat viewing context.

## Key exports
All interfaces/types listed above plus `IconName`.

## Dependencies
- Upstream: none
- Downstream: data layer, store, all components

## Key notes
- `AiMessage.role = 'proactive'` marks AI-initiated messages — they render as amber emphasized cards (confirmed design default).
- `Paragraph` is an array of inline segments (string | bold | mono number) mirroring the prototype's data-driven rich text.

## Change history

### 2026-06-13 — remove the read/unread feature
- **Motivation**: user asked to drop read-state management entirely.
- **Change**: `UpdateItem` lost its `unread` flag.

### 2026-06-12 — created
- **Motivation**: the prototype passed untyped JS objects; porting to strict TS needed a precise model of message/task/update shapes.

### 2026-06-12 — extended `IconName` with `logout`
- **Motivation**: the sidebar account menu got a dedicated sign-out icon
  (replacing the ambiguous `x`), which required a new union member.

### 2026-06-12 — extended `IconName` with `download` / `smartphone` / `monitor`
- **Motivation**: new glyphs for the sidebar "download apps" menu (trigger
  icon plus iOS / Mac platform icons).

### 2026-06-12 — slim down the chat message model
- **Motivation**: chat declutter — messages are now text-only, so `MessageExtra`, `PriceCardData`, `RecActionItem`, the `cite` inline segment and the `thinking`/`extras`/`citations`/`suggest` fields on `AiMessage` were removed. `TaskSuggestion` stays (used by the selection toolbar and /api/tasks).

### 2026-06-12 — extended `IconName` with `gear`
- **Motivation**: the sidebar footer download button became a settings
  button and needs a gear icon.

### 2026-06-13 — `AiMessage.artifacts`
- **Motivation**: a chat reply can now produce card-deck artifacts (via the
  agent's create_card_artifact tool); the message must carry clickable
  references so the chat links to the Artifacts page and survives reload.
- **Goal**: optional `artifacts?: ArtifactRef[]` on `AiMessage` (from
  `artifacts/types`).

### 2026-06-13 — `AiMessage.md` (markdown chat rendering)
- **Motivation**: chat now renders through the shared `<Markdown>` component
  (Curve-style react-markdown). LLM replies are raw markdown, so the message
  needs to carry that source instead of only the pre-split `paras`.
- **Goal**: optional `md?: string` on `AiMessage`, preferred by `MessageView`;
  when absent, `paras` is serialized via `lib/paras-to-markdown`.
