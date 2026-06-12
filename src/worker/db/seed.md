# src/worker/db/seed.ts

## Responsibility
Idempotent demo-data seeding for D1: copies the TS demo content
(`src/data/` chats, conversations, tasks, updates) into an empty database
the first time the API touches it.

## Core exports / API
- `ensureSeeded(db)` — no-op when `chats` already has rows; otherwise inserts
  the entire demo dataset in one `db.batch()` (a single transaction).

## Dependencies
- Upstream: `src/data/{chats,conversations,tasks,updates}` (single source of
  truth for demo content), `@cloudflare/workers-types`
- Downstream: every NanoBee route module calls it before reading/writing.

## Notes
- A per-isolate flag skips the `COUNT(*)` check after the first call.
- All inserts use `INSERT OR IGNORE`, so two isolates racing to seed an empty
  database cannot duplicate rows.
- Seed message ids come from `conversations.ts` and are deterministic — see
  that module's notes on why randomness is not allowed here.

## Change history

### 2026-06-12 — created
- **Motivation**: the first full-stack version still rendered mock data from
  the client bundle; nothing survived a reload. The MVP needs the same demo
  content to live in D1 so reads and writes are real.
- **Key decision**: lazy seeding from the existing TS modules instead of a SQL
  seed migration — keeps one source of truth and avoids hand-maintaining a
  large Chinese-text SQL file in parallel with the TS data.
