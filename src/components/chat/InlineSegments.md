# src/components/chat/InlineSegments.tsx

## Responsibility
Renders inline rich-text segments of an AI paragraph: plain text, bold, tabular-mono numbers, citation markers.

## Dependencies
- Upstream: src/types (Paragraph)
- Downstream: MessageView

## Change history

### 2026-06-12 — created
- **Motivation**: port of the prototype's renderInline(); a component (vs function) keeps JSX keys and typing clean.
