# src/components/chat/Sparkline.tsx

## Responsibility
Static demo sparkline with the prototype's hand-tuned up/down paths; two viewBox variants (50 for chat price cards, 46 for timeline cards).

## Dependencies
- Downstream: TimelineCard

## Change history

### 2026-06-12 — created
- **Motivation**: the prototype had two near-identical Spark components (nb-chat / nb-today); merged into one with a vbHeight variant to avoid duplication.

### 2026-06-12 — PriceCard removed
- **Motivation**: chat declutter deleted PriceCard; TimelineCard is now the only consumer.
