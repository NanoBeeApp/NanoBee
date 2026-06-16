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
- `parseModelPayload` parses a bare JSON object on the fast path; otherwise it
  extracts every balanced top-level `{...}` object (string-aware, prose-tolerant)
  and merges them by picking the richest value per key — recovering replies that
  models split across several concatenated objects.

## Change history

### 2026-06-16 — Tolerate replies split across multiple JSON objects
- **Motivation**: `/api/research/generate` 502'd because Gemini 3.5 Flash
  emitted the outline reply as several concatenated top-level objects (the main
  `{outline,...,questions}` plus a separate `{"tags":[...]}`). The old fallback
  (`/\{[\s\S]*\}/` greedy match) spanned both objects → invalid JSON.
- **Fix**: replace the greedy regex with a string-aware balanced-brace scanner
  (`extractJsonObjects`) + per-key richest-value merge (`mergeJsonObjects`). A
  single object still takes the fast `JSON.parse` path; prose-wrapped and
  multi-object replies now reassemble into one payload before validation.

### 2026-06-13 — Created

### 2026-06-13 — Created
- **Motivation**: The worker needs to validate that every AI generation
  conforms to the research contract before it reaches the canvas.
- **Goal**: One place that enforces the JSON shape + the exactly-three-questions
  invariant, with parsing tolerant of models that wrap JSON in prose.
- **Key decision**: Fix follow-ups at exactly 3 (vs Curve's relaxed 3–9) to keep
  the canvas card layout and product invariant simple.
