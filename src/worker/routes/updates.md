# src/worker/routes/updates.ts

## Responsibility
`/api/updates` — read-state persistence for the Today page and the
notification bell.

## Core exports / API
- `updateRoutes` — Hono sub-app:
  - `POST /read-all` → `{ ok: true }`
  - `POST /:id/read` `{ read: boolean }` → `{ ok: true }` | `404` | `500`

## Dependencies
- Upstream: `db/seed`, zod, `../api-worker` (Env type)
- Downstream: mounted by `routes/api.ts`; called by the store's markRead/markAllRead

## Notes
- `read: false` supports the "标为未读" toggle on Today cards.
- `meta.changes === 0` is how a missing id surfaces as 404 (one UPDATE, no
  extra SELECT).

## Change history

### 2026-06-12 — created
- **Motivation**: the unread badge drove the daily "open the Today page"
  ritual but reset on every reload; read state is the cheapest piece of
  persistence with the most visible payoff.
