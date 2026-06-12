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
- Upstream: `db/seed`, `../reply` (genReply), `../agent/loop`, zod,
  `../api-worker` (Env type)
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

### 2026-06-12 — drop the persona system prompt
- **Motivation**: per request, the send pipeline should no longer inject the
  NanoBee product-persona system prompt; the model replies without a preset
  voice.
- **Goal**: stop prepending `{ role: "system", content: CONFIG.AI.SYSTEM_PROMPT }`
  (and `CONFIG` is no longer imported here). The optional reading-context
  system message built from `ctxTitle` stays — it is functional context, not a
  persona prompt.

### 2026-06-12 — ground replies in live data-hub data
- **Motivation**: questions like "what developer news is on HN today" need
  live external data, but the data sources are open-ended — hardcoding a route
  per topic does not scale.
- **Goal**: before the answering call, run `augmentWithData` which lets the
  model route the question to a data-hub source (discovered from the hub
  catalog), fetch it, and prepend the digest as grounding context.
- **Key decision**: augmentation is best-effort and prepended, not branched —
  no per-source logic lives in this route; the data hub being down/unset just
  skips it and chat answers from the model alone.

### 2026-06-12 — agent loop replaces single-shot augmentation
- **Motivation**: one route-then-answer pass could fetch at most one source
  and could not react to results; the user asked for a real agent cycle with
  tools, skills and MCP.
- **Goal**: the send pipeline now calls `runAgentLoop` — the model
  iteratively invokes tools (data-hub sources, built-in skills, MCP servers)
  until it answers; `datahub/augment` was removed as superseded.
- **Key decision**: the route stays tool-agnostic — it logs `toolsUsed` for
  observability but never names a tool; any loop failure falls back to the
  rule-based reply exactly as before.
