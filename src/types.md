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

### 2026-06-15 — `InlineSuggestion` + `AiMessage.taskSuggestion`
- **Motivation**: the NL→TriggerSpec compiler attaches a task suggestion to AI
  replies when a monitoring/scheduling intent is detected; the chat UI renders a
  confirmation card from this field.
- **Changes**:
  - Added `InlineSuggestion` interface: `taskId`, `title`, `topic`,
    `triggerLabel`, `message`, `triggerSpec`.
  - Added optional `taskSuggestion?: InlineSuggestion` to `AiMessage`.
  - `MessageView` reads this field and renders `<TaskSuggestionCard>` when set.

### 2026-06-15 — Added optional `triggerSpec?: TriggerSpec` to `Task`
- **Motivation**: The `TaskDetailDrawer` needs access to the structured trigger spec to show a human-readable summary (schedule hour/minute, condition source/op/threshold). The spec is now surfaced from the `trigger_spec` D1 column via `repo.rowToTask`.
- **Change**: Added optional `triggerSpec?: TriggerSpec` field to the `Task` interface. Backward-compatible — tasks without a spec behave as before.

### 2026-06-15 — Added optional `kind` / `runState` / `batch` / `history` to `Task`
- **Motivation**: The redesigned Tasks page renders one-off / schedule / condition / batch tasks, batch progress with child rows, and a run-history timeline.
- **Goal**: Carry the new display data without breaking existing rows.
- **Change**: Added `TaskKind`, `RunState`, `SubTask`, `TaskBatch`, `RunRecord` and the optional `kind` / `runState` / `batch` / `history` fields on `Task`. All optional, so old payloads still validate and `taskKind()` derives the kind from `triggerType` when absent.

### 2026-06-15 — Added `TriggerSpec` union type and supporting types
- Added `ScheduleTrigger` (kind, hour, minute, label, message?) for daily UTC schedule tasks.
- Added `ConditionTrigger` (kind, sourceId, metric, op, threshold?, cooldownSeconds, messageTemplate, params?) for data-hub metric threshold tasks.
- Added `ConditionOp` type union (`'gt' | 'lt' | 'gte' | 'lte' | 'changed'`).
- Added `TriggerSpec = ScheduleTrigger | ConditionTrigger` union.
- All new types are pure data with no logic — safe for JSON round-trip through the `trigger_spec` D1 column.

### 2026-06-15 — extended `IconName` with `table`
- **Motivation**: the Artifacts gallery view switch needed a `table` glyph.

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

### 2026-06-14 — `AiMessage.streaming` (transient typewriter flag)
- **Motivation**: the chat now streams replies; the in-flight message must tell
  `MessageView` to render with the `<Markdown streaming>` mode.
- **Goal**: optional client-only `streaming?: boolean` on `AiMessage`, set on the
  placeholder while tokens arrive and dropped when the authoritative message
  replaces it; never persisted.
