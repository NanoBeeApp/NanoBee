# src/components/chat/MessageView.tsx

## Responsibility
Renders one chat message: user bubble / AI reply (minimal "NanoBee" role row, rich paragraphs only) / proactive amber card with "NanoBee 主动推送" tag.

## Dependencies
- Upstream: types, icons, `common/Markdown`, `lib/paras-to-markdown`
- Downstream: ChatView, QuickChat

## Key notes
- AI text containers carry data-ai-text="1" — the SelectionFloat only activates inside them. The attribute is forwarded onto the `<Markdown>` root.
- AI/proactive bodies render through the shared `<Markdown>` component: `m.md ?? parasToMarkdown(m.paras)`. The `nb-body` class on the Markdown root supplies chat prose context (font size / color) via CSS variables.
- Proactive style is fixed to the emphasized card (design's confirmed default; the prototype's inline tweak variant was a design-tool exploration).

## Change history

### 2026-06-12 — created
- **Motivation**: design handoff; the amber framing is the product's core differentiation (AI-initiated vs user-initiated).

### 2026-06-12 — declutter the AI message
- **Motivation**: user feedback — the chat felt cluttered; the model-name label and the copy/like/regenerate/bookmark action row were noise (the actions had no implementation behind them).
- **Goal**: AI messages show only a minimal "NanoBee" role row and the body; extras/suggest rendering stays so server-driven cards/chips can return later.

### 2026-06-12 — text-only messages
- **Motivation**: user feedback — the message area was still cluttered (thinking pill, task-suggestion card, citation chips, reply-suggestion chips).
- **Goal**: keep only the basic content — role row + paragraphs (user bubble / proactive card framing unchanged). Props reduced to `{ m }`; PriceCard / RecommendedActions / TaskSuggestCard were deleted.

### 2026-06-13 — agent-trace debug entry
- **Motivation**: surface the agent execution process per AI reply.
- **Goal**: messages whose payload carries `trace` render an「执行过程」
  pill in the role row (testid `agent-trace-open-button`) that toggles
  `AgentTraceModal`; the open/close flag is local UI state.

### 2026-06-13 — inline artifact references
- **Motivation**: replies that generate card-deck artifacts should link to them
  from the chat.
- **Goal**: when `m.artifacts` is non-empty, render `ArtifactRefCard` under the
  body (clickable cards that open the Artifacts page).

### 2026-06-13 — markdown rendering via shared `<Markdown>`
- **Motivation**: AI replies are markdown (LLM output), but the old
  `InlineSegments` path only handled plain text / bold / numbers, so headings,
  lists, code, links, tables and math showed as literal syntax. User asked to
  display chat content as markdown (referencing the Curve project) and extract a
  shared component.
- **Goal**: body now renders `<Markdown content={m.md ?? parasToMarkdown(m.paras)} />`.
  `InlineSegments` is no longer used by chat.
