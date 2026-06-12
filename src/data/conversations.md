# src/data/conversations.ts

## Responsibility
Scripted demo conversations keyed by chat id — pure data with rich-text paragraphs, citations, price/task extras and suggestion chips.

## Dependencies
- Upstream: src/types, data/ids
- Downstream: store (cloned into state)

## Key notes
- `wid()` assigns ids using a DistributiveOmit so the ChatMessage union keeps its discriminated shape (plain Omit collapses unions).

## Change history

### 2026-06-12 — created
- **Motivation**: ported from nb-convos.jsx; conversations seed the demo so the gold story (proactive push → why → create task) is visible on first load.
