# src/data/reply.ts

## Responsibility
Canned AI-reply generator (`genReply`) for free-typed messages: keyword → topic + matching task suggestion; prepends a context line when the user is viewing a Today item.

## Dependencies
- Upstream: src/types, data/ids
- Downstream: store.send / store.sendQuick

## Change history

### 2026-06-12 — created
- **Motivation**: ported from the prototype; keeps the demo interactive (every message gets a plausible reply + task card) until a real backend exists.
