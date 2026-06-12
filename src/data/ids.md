# src/data/ids.ts

## Responsibility
Collision-resistant client-side id generator (`nextId(prefix)`) for chats, messages, tasks and toasts.

## Dependencies
- Upstream: nanoid
- Downstream: store, SelectionFloat

## Change history

### 2026-06-12 — created
- **Motivation**: ported from the prototype's nb-convos.jsx; demo-scale uniqueness without pulling in a uuid dependency.

### 2026-06-12 — nanoid
- **Motivation**: ids now persist to D1, so a per-page-load counter (`m_1001`…) would collide across sessions and devices. nanoid(10) keeps the same `prefix_xxx` shape with real uniqueness.
