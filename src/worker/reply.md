# src/worker/reply.ts

## Responsibility
Server-side AI-reply generator: detects a topic by keyword (chat
categorization only) and wraps the LLM-written reply text into a chat
message, acknowledging the Today-page reading context when present.
Intentionally minimal — no task-suggestion cards or quick-reply chips are
attached until those features actually ship.

## Core exports / API
- `genReply(text, ctxTitle?)` → `{ topicId, msg: AiMessage }`

## Dependencies
- Upstream: `src/types`, `nanoid` (per-request ids; safe inside handlers)
- Downstream: `routes/messages.ts`

## Notes
- Ids are generated per request inside the handler call path — never at module
  scope (Workers forbid random values in global scope).

## Change history

### 2026-06-12 — created (moved from src/data/reply.ts)
- **Motivation**: reply generation ran in the browser, so "AI" output was a
  client illusion and could never persist or evolve into a real model call.
  Moving it behind POST /api/messages makes the server the brain.
- **Key decision**: kept the rule-based content identical to the prototype so
  the UX is unchanged; only the id generation switched to nanoid because ids
  now land in D1 and must be unique across sessions.

### 2026-06-12 — LLM reply text
- **Motivation**: the backend now calls a real model (default: DeepSeek V4
  Flash via OpenRouter), so the reply text should come from the LLM while
  the structured task proposal stays rule-based.
- **Goal**: `genReply` accepts an optional `llm` argument
  (`{ text, model }`); when present the paragraphs come from `textToParas`
  and `msg.model` is set, otherwise the original fallback copy is used.
- **Key decision**: keep topic detection and the task card rule-based — they
  feed structured product objects the model can't reliably produce yet.

### 2026-06-12 — declutter: drop task cards and quick-reply chips
- **Motivation**: user feedback — the chat UI felt noisy; every reply pushed a
  rule-based task card (often irrelevant, e.g. a gold-watch card on a weather
  question) plus three canned quick-reply chips.
- **Goal**: replies carry only the LLM text; keyword topic detection survives
  solely to categorize the chat row. Cards/chips return when the features are
  real instead of canned.
- **Key decision**: the client keeps the rendering code for extras/suggest, so
  re-enabling is a server-side change only.

### 2026-06-13 — carry raw markdown (`msg.md`)
- **Motivation**: the client now renders AI replies through the shared
  `<Markdown>` component, and LLM output is markdown. Splitting it into `paras`
  (`textToParas`) destroyed list/heading structure.
- **Goal**: when `llm` is present, set `msg.md = llm.text` (verbatim markdown).
  `paras` is still populated as a structured fallback, but `MessageView` prefers
  `md`.
