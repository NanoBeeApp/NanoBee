# src/worker/routes/chat-messages.ts

## Responsibility
`GET /api/chats/:id/messages` — cursor-based older-message endpoint for one
chat. Allows the frontend to load history on demand without bloating the
bootstrap payload.

## Core exports / API
- `chatMessageRoutes` — Hono sub-app:
  - `GET /:id/messages?before=<cursor>&limit=<n>`
    → `200 { messages: ChatMessage[], hasMore: boolean, oldestCursor: string | null }`
    | `400` invalid query | `500`

## Query parameters
| Param  | Type   | Default | Notes                                                                    |
|--------|--------|---------|--------------------------------------------------------------------------|
| before | string | —       | Required. Opaque cursor `"<created_at>_<id>"` from the bootstrap/previous page. |
| limit  | number | 30      | Page size. Clamped 1–100.                                                |

## Dependencies
- Upstream: `db/repo` (`listMessagesPage`, `decodeCursor`, `ANON_OWNER`, `BOOTSTRAP_MSG_LIMIT`),
  `auth/cookies` (`getSessionToken`), `auth/store` (`getUserBySessionToken`),
  `../api-worker` (Env type)
- Downstream: mounted by `routes/api.ts` at `/chats`; called by the store's
  `loadOlderMessages` action.

## Notes
- Owner-scoped: the D1 query always includes `AND owner = ?` so users cannot
  read each other's messages by guessing a chatId.
- The `before` cursor is an opaque server-produced string (`"<epoch>_<id>"`).
  The Zod validator calls `decodeCursor` to reject malformed values before they
  reach the database query. No injection risk beyond standard parameterized queries.
- Mounted at `/api/chats` (not `/api/messages`) so it does not collide with
  the existing `POST /api/messages` and `POST /api/messages/stream` routes.
- The cursor uses `(created_at, id)` instead of `rowid` because SQLite's `rowid`
  virtual column cannot appear in `CREATE INDEX` — see migration 0020 notes.

## Change history

### 2026-06-15 — switch cursor from rowid (integer) to opaque string
- **Root cause**: `CREATE INDEX ... (owner, chat_id, rowid DESC)` in migration 0020
  fails with `SQLITE_ERROR: no such column: rowid`. Cursor must use real columns.
- **Change**: `?before=<rowid>` (integer) → `?before=<created_at>_<id>` (URL-encoded string).
  Zod validator now calls `decodeCursor` from `db/repo`. Response field `oldestRowid`
  renamed to `oldestCursor`.

### 2026-06-15 — created
- **Motivation**: the bootstrap payload previously returned all messages for
  every chat, which becomes expensive for users with long conversation histories.
  This endpoint enables the frontend to lazy-load older pages on scroll.
