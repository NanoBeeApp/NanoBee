# cards/contract.ts

## Responsibility
AI output contract for dynamic cards: defines the deck JSON shape the model must return (zod schema) and fault-tolerant parsing. Generalized over "the card schema for each kind" — all kinds share the same envelope and parser.

## Core exports / API
- `wordCardSchema`: zod schema for a word card
- `deckPayloadSchema(cardSchema)`: generic deck envelope schema (title / subtitle? / cards[])
- `parseDeckPayload(rawContent, cardSchema)`: parses and validates raw model output into a deck payload; handles both bare JSON and `{...}` embedded in surrounding prose

## Dependencies
- Upstream: zod, `cards/prompt.ts` (supplies the per-kind `cardSchema`)
- Downstream: `worker/cards/generate.ts`

## Key implementation notes
- Fault-tolerant parsing modelled after `research/contract.ts`: tries `JSON.parse` first, falls back to a regex that extracts the first `{...}` block
- `cards` array is `min(1).max(30)` to prevent empty decks and cap single-generation size
- The model returns only `title` / `subtitle` / `cards`; `kind` and metadata are appended server-side

## Change history

### 2026-06-13 — Created
- **Motivation**: needed to reliably convert LLM text into structured cards in a way that could be reused across multiple card types
- **Goal**: one generic contract plus fault-tolerant parsing covering all kinds
- **Key decisions**: `deckPayloadSchema` accepts a `cardSchema` parameter for genericity instead of duplicating the parser for each kind
