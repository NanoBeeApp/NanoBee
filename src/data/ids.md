# src/data/ids.ts

## Responsibility
Monotonic client-side id generator (`nextId(prefix)`) for messages, tasks, session chats and toasts.

## Dependencies
- Downstream: data/conversations, data/reply, store, SelectionFloat

## Change history

### 2026-06-12 — created
- **Motivation**: ported from the prototype's nb-convos.jsx; demo-scale uniqueness without pulling in a uuid dependency.
