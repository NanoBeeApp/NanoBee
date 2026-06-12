# src/worker/reply.ts

## Responsibility
Server-side AI-reply generator (rule-based for the MVP): picks a topic by
keyword, proposes a matching task suggestion, and acknowledges the Today-page
reading context when present. The single seam where a real LLM call will be
swapped in later.

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
