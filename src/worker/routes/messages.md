# src/worker/routes/messages.ts

## Responsibility
`POST /api/messages` — the chat send pipeline: persists the user message,
creates the chat row when new, generates the AI reply server-side, persists
it and returns it.

## Core exports / API
- `messageRoutes` — Hono sub-app:
  - `POST /` `{ chatId, userMessageId, title?, text, ctxTitle?, ctxTopicId? }`
    → `201 { chatId, topicId, aiMessage }` | `400` invalid | `500`

## Dependencies
- Upstream: `db/seed`, `../reply` (genReply), zod, `../api-worker` (Env type)
- Downstream: mounted by `routes/api.ts`; called by the store's send/sendQuick

## Notes
- The client supplies the chat id and user-message id (nanoid) so its
  optimistic render matches what lands in D1 — no id remapping on response.
- `INSERT OR IGNORE` on both the chat and the user message makes retries
  idempotent; the whole write is one `db.batch()` transaction.
- The chat's `topic_id` is updated on every send (AI auto-categorization per
  PRD); a Today-page reading context (`ctxTopicId`) pins the topic instead.

## Change history

### 2026-06-12 — created
- **Motivation**: chat was the core loop still running on client-side mocks;
  messages vanished on reload. This endpoint makes the conversation the
  server's record and moves reply generation behind the API.
- **Key decision**: client-generated ids over server-generated ones — keeps
  optimistic UI trivial and the validation regex bounds the format.

### 2026-06-12 — review fix
- **Motivation**: code review found the `isNew` flag was validated but never
  read (`INSERT OR IGNORE` already covers both cases); removed it from the
  contract.

### 2026-06-12 — real LLM call in the send pipeline
- **Motivation**: chat replies were rule-based; the backend should answer
  with the configured AI provider (per-user settings, defaulting to
  OpenRouter + DeepSeek V4 Flash on the built-in key).
- **Goal**: resolve the session user → `resolveAiConfig` → `generateChatText`
  for the reply text; any provider failure logs the error and falls back to
  the rule-based reply so chat never breaks.
- **Key decision**: signed-out visitors also get the backend default config —
  chat is usable without an account today and the behavior stays consistent.
