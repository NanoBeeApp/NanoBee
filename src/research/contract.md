# research/contract.ts

## File responsibility
Defines the strict AI output contract for research generation (zod schema) and
tolerant parsing of the model's raw text into a validated payload.

## Core exports / API
- `FOLLOWUP_COUNT` (= 3) and `followupQuestionsSchema` — the exactly-three
  follow-up questions invariant.
- `outlineItemSchema` / `modelPayloadSchema` / `ModelPayload` — the JSON shape
  the model must return (`content`, `questions`, optional `summary` / `outline`
  / `tags`).
- `parseModelPayload(rawContent)` — JSON-extract + sanitize + validate.

## Dependencies
- Upstream: `zod`, `research/types.ts`.
- Downstream: `worker/research/generate.ts`.

## Key implementation notes
- Ported from Curve's `core/ai/{schema,parse,followup}.ts`, trimmed: dropped
  explore mode, citations, prompt-trace, audit, and the 3–9 range (NanoBee
  fixes follow-ups at exactly 3 per product invariant).
- `sanitizePayload` merges the model's `outlineBriefs` mirror tree into
  `outline` by index, then strips it, and filters non-object outline items.

## Change history

### 2026-06-13 — Created
- **Motivation**: The worker needs to validate that every AI generation
  conforms to the research contract before it reaches the canvas.
- **Goal**: One place that enforces the JSON shape + the exactly-three-questions
  invariant, with parsing tolerant of models that wrap JSON in prose.
- **Key decision**: Fix follow-ups at exactly 3 (vs Curve's relaxed 3–9) to keep
  the canvas card layout and product invariant simple.
