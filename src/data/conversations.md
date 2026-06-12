# src/data/conversations.ts

## Responsibility
Scripted demo conversations keyed by chat id — pure data with rich-text paragraphs, citations, price/task extras and suggestion chips. Doubles as the D1 seed content for the messages table.

## Dependencies
- Upstream: src/types
- Downstream: store (instant-render fallback), worker db/seed (seeding)

## Key notes
- `wid()` assigns ids using a DistributiveOmit so the ChatMessage union keeps its discriminated shape (plain Omit collapses unions).
- Ids are deterministic (`m_seed_N` counter): this module also loads inside the Worker, where random values are forbidden in global scope, and seed ids should be stable across isolates anyway.

## Change history

### 2026-06-12 — created
- **Motivation**: ported from nb-convos.jsx; conversations seed the demo so the gold story (proactive push → why → create task) is visible on first load.

### 2026-06-12 — deterministic seed ids
- **Motivation**: `wrangler deploy` failed with "Disallowed operation called within global scope" — `wid()` ran nanoid at module load inside the Worker bundle. Seed ids are now a plain counter, which is also more correct: seed data should have stable ids.
