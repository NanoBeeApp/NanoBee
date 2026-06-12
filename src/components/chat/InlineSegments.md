# src/components/chat/InlineSegments.tsx

## Responsibility
Renders inline rich-text segments of an AI paragraph: plain text, bold, tabular-mono numbers.

## Dependencies
- Upstream: src/types (Paragraph)
- Downstream: MessageView

## Change history

### 2026-06-12 — created
- **Motivation**: port of the prototype's renderInline(); a component (vs function) keeps JSX keys and typing clean.

### 2026-06-12 — remove citation markers
- **Motivation**: chat declutter — citations were dropped from messages, so the `cite` segment kind was removed from the type and the renderer.
