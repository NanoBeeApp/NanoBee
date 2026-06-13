# src/worker/db/seed.ts

## Responsibility
Idempotent demo-data seeding for D1 — **local dev only**: copies the TS demo
content (`src/data/` chats, conversations, tasks, updates) into an empty
database the first time the API touches it. Seeding is gated on the
`SEED_DEMO_DATA="1"` var (set in `.dev.vars`); deployed environments leave it
unset so their databases start empty like a fresh user account.

## Core exports / API
- `ensureSeeded(env)` — no-op unless `env.SEED_DEMO_DATA === "1"`; no-op when
  `chats` already has rows; otherwise inserts the entire demo dataset in one
  `db.batch()` (a single transaction). Takes a structural `{ DB,
  SEED_DEMO_DATA? }` slice of `Env` so the gate lives in one place.

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

### 2026-06-13 — remove the read/unread feature
- **Motivation**: user asked to drop read-state management entirely.
- **Change**: update rows are inserted without the `unread` column (dropped
  by migration 0006).

### 2026-06-12 — created
- **Motivation**: the first full-stack version still rendered mock data from
  the client bundle; nothing survived a reload. The MVP needs the same demo
  content to live in D1 so reads and writes are real.
- **Key decision**: lazy seeding from the existing TS modules instead of a SQL
  seed migration — keeps one source of truth and avoids hand-maintaining a
  large Chinese-text SQL file in parallel with the TS data.

### 2026-06-12 — seeding gated behind SEED_DEMO_DATA (local dev only)
- **Motivation**: real accounts on deployed environments saw the demo data —
  unconditional seeding re-filled any emptied database on the next request,
  making a clean "new user" state impossible.
- **Goal**: deployed databases start and stay empty; local dev keeps the demo
  content for UI work and the integration tests.
- **Key decision**: the gate lives inside `ensureSeeded` (signature changed
  from `(db)` to `(env)`) instead of at each of the six route call sites —
  one place to check, impossible for a future route to forget.
