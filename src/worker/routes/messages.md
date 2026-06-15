# src/worker/routes/messages.ts

## Responsibility
`POST /api/messages` — the chat send pipeline: persists the user message,
creates the chat row when new, generates the AI reply server-side, persists
it and returns it.

## Core exports / API
- `messageRoutes` — Hono sub-app:
  - `POST /` `{ chatId, userMessageId, title?, text, ctxTitle?, ctxTopicId?, ctxPage? }`
    → `201 { chatId, topicId, aiMessage }` | `400` invalid | `500`

## Dependencies
- Upstream: `../reply` (genReply), `../agent/loop`, zod,
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

### 2026-06-15 — forward the client "stop" to the agent loop
- **Motivation**: when the user pressed stop, the browser aborted the fetch but
  the worker kept generating (and burning tokens) server-side.
- **Change**: the `/stream` route now passes `c.req.raw.signal` (which fires when
  the client disconnects) as the last arg to `runAgentLoop`, so the loop stops
  between iterations and the abort propagates to the upstream LLM fetch. Whatever
  text streamed before the abort is still persisted (the existing catch path), so
  a stopped reply survives reload.

### 2026-06-15 — viewing context covers the whole page, not just the article
- **Motivation**: the quick chat now reports which surface the user is on (today
  / tasks / artifacts / research / compare), so replies can be grounded in the
  page even when no specific article is in view.
- **Change**: `sendSchema` accepts an optional `ctxPage` (≤120 chars);
  `buildAgentMessages` composes the system context from `ctxPage` (the page) and
  `ctxTitle` (the in-view item) — `用户正在使用 NanoBee。当前所在页面：…；正在查看：「…」。`
  Either or both may be present; absent → no system message, as before.

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

### 2026-06-13 — inject web-search credential into the agent context
- **Motivation**: the hub's websearch source declares a secret
  `tavily_api_key` param; credentials must be injected server-side, never
  exposed to the model.
- **Goal**: resolve the user's key (else the built-in default) via
  `resolveWebSearchKey` and pass it to `runAgentLoop` as
  `ctx.secrets.tavily_api_key`.

### 2026-06-13 — persist the agent trace in the AI message
- **Motivation**: the debug modal must work after reload, not only on the
  live response.
- **Goal**: spread `run.trace` into the persisted/returned AI message
  payload (`TracedAiMessage`); absent on rule-based fallback replies.

### 2026-06-13 — artifact creation context
- **Motivation**: a chat message can now generate card-deck artifacts via the
  agent's create_card_artifact tool.
- **Goal**: pass `artifacts: { owner, chatId, created }` in the agent context;
  after the run, spread any `created` refs into the persisted/returned AI
  message so the chat shows clickable artifact cards.

### 2026-06-13 — web search secret keyed by provider
- **Change**: the per-request web-search key is now injected under
  `<provider>_api_key` (from `resolveWebSearchKey`'s `{provider,key}`), not
  hardcoded `tavily_api_key`, so Brave/Serper/Exa keys reach the data-hub source.

### 2026-06-15 — fix: AI message INSERT OR IGNORE (security review)

The AI message row was inserted with `INSERT INTO` (no `OR IGNORE`). If a
streaming client retried or if `persistTurn` was called twice for the same
turn, a duplicate AI row would be written with the same `id`, causing a D1
unique-constraint error. Changed to `INSERT OR IGNORE` to match the user
message row; the id is stable per turn so a retry simply skips the duplicate
insert and the final `final` SSE event is still emitted correctly.

### 2026-06-15 — multi-tenant owner isolation in persistTurn
- **Motivation**: migration 0012 adds `owner` columns to `chats` and `messages`. Inserts
  must carry the owner so chats and messages land in the correct user bucket and are never
  visible across accounts.
- **Changes**:
  - `persistTurn` gains an `owner: string` parameter.
  - Both `INSERT INTO chats` and both `INSERT INTO messages` now include the `owner` column.
  - `UPDATE chats SET topic_id` gains `AND owner = ?` as a security guard.
  - Both call sites (POST / and POST /stream) pass `agentCtx.artifacts.owner` as the
    owner argument — the same value already resolved by `prepareRun` for artifact context.

### 2026-06-15 — remove ensureSeeded calls and db/seed dependency
- **Motivation**: remove all demo/seed data and hardcoded fixed data so the app starts empty; `db/seed.ts` and the `SEED_DEMO_DATA` env flag were deleted entirely.
- The `ensureSeeded(c.env)` calls that previously ran at the top of both `POST /` and `POST /stream` handlers are removed, along with the `db/seed` import.
- No behavior change for real use; the DB simply starts empty and fills through user messages.

### 2026-06-14 — streaming sibling `POST /stream` (SSE)
- **Motivation**: chat replies arrived all at once after a long wait (no
  streaming). The reading experience needed a live typewriter.
- **Change**: refactored the shared steps into `buildAgentMessages` /
  `prepareRun` / `persistTurn`, then added `POST /stream` using Hono `streamSSE`:
  it runs `runAgentLoop` with an `onToken` that emits `token` events, then a
  `final` event with the same payload `POST "/"` returns. `POST "/"` stays for
  the quick chat / non-streaming fallback.
- **Key decision**: persist the accumulated streamed text (what the user
  watched type out) so the `final` swap-in never jumps; chat never breaks — an
  LLM/agent failure still falls back to the rule-based reply via `final`, and
  config/secrets resolve before the stream opens so setup errors stay clean
  HTTP errors.
