# src/components/chat/PriceCard.tsx

## Responsibility
Price/monitor data card inside a chat message: label, big mono value, delta badge and sparkline.

## Dependencies
- Upstream: types (PriceCardData), Sparkline
- Downstream: MessageView (extra kind 'price')

## Change history

### 2026-06-12 — created
- **Motivation**: design handoff; embedded data cards are how proactive pushes show "data, not raw numbers".
