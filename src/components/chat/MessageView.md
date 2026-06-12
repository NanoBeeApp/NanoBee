# src/components/chat/MessageView.tsx

## Responsibility
Renders one chat message: user bubble / AI reply (minimal "NanoBee" role row, thinking pill, rich paragraphs, extras, citations, suggestion chips when present) / proactive amber card with "NanoBee 主动推送" tag.

## Dependencies
- Upstream: types, icons, InlineSegments, PriceCard, RecommendedActions, TaskSuggestCard
- Downstream: ChatView, QuickChat

## Key notes
- AI text containers carry data-ai-text="1" — the SelectionFloat only activates inside them.
- Proactive style is fixed to the emphasized card (design's confirmed default; the prototype's inline tweak variant was a design-tool exploration).

## Change history

### 2026-06-12 — created
- **Motivation**: design handoff; the amber framing is the product's core differentiation (AI-initiated vs user-initiated).

### 2026-06-12 — declutter the AI message
- **Motivation**: user feedback — the chat felt cluttered; the model-name label and the copy/like/regenerate/bookmark action row were noise (the actions had no implementation behind them).
- **Goal**: AI messages show only a minimal "NanoBee" role row and the body; extras/suggest rendering stays so server-driven cards/chips can return later.
