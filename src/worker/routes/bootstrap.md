# src/worker/routes/bootstrap.ts

## Responsibility
`GET /api/bootstrap` — returns the app's full initial state (sidebar chats,
conversations, tasks, Today updates) in one round-trip. The database always
starts empty; returned state reflects only real user activity.

## Core exports / API
- `bootstrapRoutes` — Hono sub-app: `GET /` → `{ chats, conversations, pagination, tasks, updates, onboardingDone }` | `500`
  - Results are scoped to the caller's owner bucket (signed-in user id or `"anon"`).
  - `conversations`: the most recent 30 messages per chat (oldest→newest within the window).
  - `pagination`: `Record<chatId, { hasMore: boolean, oldestRowid: number | null }>` — per-chat cursor for load-older requests.

## Dependencies
- Upstream: `db/repo`, `db/seed`, `auth/cookies`, `auth/store`, `../api-worker` (Env type)
- Downstream: mounted by `routes/api.ts`; consumed by the store's `bootstrap()`

## Notes
- The four list queries run in `Promise.all` — independent reads, one trip each.
- `ensureAnonSeed` runs before the queries when `owner === ANON_OWNER` (one extra D1 SELECT
  on the fast-path; one batch INSERT on first cold-start for anon visitors).

## Change history

### 2026-06-12 — created
- **Motivation**: the client needs the persisted state on startup; one
  endpoint instead of four keeps first paint to a single fetch and gives the
  seeding hook a natural home.

### 2026-06-12 — demo seeding restricted to local dev
- **Motivation**: real accounts on deployed environments saw the prototype's
  demo chats/tasks/updates; clearing the database didn't help because the
  next request re-seeded it.
- **Goal**: deployed environments boot into a clean new-user state.
- **Key decision**: the env gate lived inside `ensureSeeded` (gated on
  `SEED_DEMO_DATA="1"`), so this route called it unconditionally.

### 2026-06-15 — remove ensureSeeded call and db/seed dependency
- **Motivation**: remove all demo/seed data and hardcoded fixed data so the app starts empty; `db/seed.ts` and the `SEED_DEMO_DATA` env flag were deleted entirely.
- The `ensureSeeded(c.env)` call and the `db/seed` import are removed; the route now runs the four `Promise.all` D1 reads unconditionally with no seeding step.
- The DB always starts empty; any content is the result of real user activity.

### 2026-06-15 — include onboardingDone in bootstrap response (migration 0017)
- **Motivation**: the onboarding flow needs the flag without a second round-trip.
- **Change**: `resolveOwner` now returns both `owner` and `userId`; a separate D1 query reads `users.onboarding_done`; users with existing tasks are auto-completed to avoid showing the flow to active users after the migration is applied. The response now includes `onboardingDone: boolean`.

### 2026-06-15 — message pagination: trimmed bootstrap conversations
- **Motivation**: the bootstrap payload was returning every message of every chat
  (no limit), which bloats the initial response for users with long conversation
  histories.
- **Change**: switched from `listConversations` (full history) to
  `listConversationsTrimmed` (last 30 per chat). The response now includes a
  `pagination` field: `Record<chatId, { hasMore, oldestRowid }>` so the frontend
  can offer to load older pages on demand via `GET /api/chats/:id/messages`.
- **Key decision**: the trimming is done in JS (not SQL window functions) because
  D1's window function support is limited; at the expected scale (≤hundreds of
  messages per user at bootstrap) the full-table scan is acceptable.

### 2026-06-15 — multi-tenant owner isolation + lazy anon seed
- **Motivation**: migration 0012 adds `owner` columns to all four core tables. Each user
  must only see their own chats/messages/tasks/updates; the anon bucket needs demo content
  so signed-out visitors get a meaningful first experience.
- **Changes**:
  - Resolve the owner from the session cookie (`getSessionToken` → `getUserBySessionToken`
    → `user.id ?? ANON_OWNER`), mirroring `research.ts`.
  - Call `ensureAnonSeed(c.env.DB)` before the list queries when `owner === ANON_OWNER`
    (idempotent; fast-path on all subsequent requests).
  - All four `list*` calls now receive `owner` as the second argument.
