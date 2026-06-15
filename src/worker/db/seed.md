# src/worker/db/seed.ts

## Responsibility
Lazy, idempotent demo-data seeding for the `"anon"` owner bucket.

On the very first `GET /api/bootstrap` request for a fresh database, `ensureAnonSeed`
checks whether the anon bucket already contains chats. If not, it inserts the canonical
demo content (7 chats, 16 messages, 5 tasks, 7 updates) in a single D1 batch so that
signed-out visitors see a meaningful app immediately.

Signed-in users are never affected — they have their own owner bucket, which starts empty.

## Core exports / API
- `ensureAnonSeed(db: D1Database): Promise<void>`
  - Fast-path if anon bucket already has chats (one SELECT).
  - Otherwise inserts all seed rows via `db.batch([...])` (one D1 round-trip).
  - All ids are hard-coded string literals — no `nanoid` / `Math.random` / `Date.now`
    at module scope (required by Cloudflare Workers global-scope rule, error 10021).
  - Uses `INSERT OR IGNORE` throughout — safe to call concurrently on cold start.

## Seed content (canonical ids)

| Table    | Ids |
|----------|-----|
| chats    | `c_gold_today`, `c_gold_setup`, `c_edu_test`, `c_brief`, `c_edu_plan`, `c_health`, `c_gold_tax` |
| messages | `m_seed_1` … `m_seed_16` |
| tasks    | `t_gold_alert`, `t_gold_brief`, `t_edu_hw`, `t_brief`, `t_health` |
| updates  | `u1`, `u2`, `u3`, `u4`, `u5`, `u6`, `u7` |

The test suite asserts `c_gold_today` has ≥ 3 messages (`m_seed_1`, `m_seed_2`, `m_seed_3`).

## Dependencies
- `../artifacts/repo` — imports `ANON_OWNER` constant
- `@cloudflare/workers-types` — `D1Database`

## Change history

### 2026-06-15 — created (multi-tenant owner isolation)
- **Motivation**: migration 0012 adds `owner` columns to chats/messages/tasks/updates.
  The `bootstrap` route now returns only the caller's owner bucket, so anon visitors
  need their bucket pre-populated with demo content on first visit.
- **Replaces** the old `ensureSeeded(env)` function (deleted in commit 8dc99d8) which
  seeded globally (no owner scope) and only ran when `SEED_DEMO_DATA="1"`.
- **New design**: always runs for the `"anon"` bucket (no env flag needed); triggered
  lazily by `bootstrap.ts` before the list queries.
- All seed rows carry `owner = 'anon'` so they live in the anon bucket and do not bleed
  into any signed-in user's view.
