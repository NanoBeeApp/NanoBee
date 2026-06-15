# cards/prompt.ts

## Responsibility
Registry of per-kind generation specs (`CardKindSpec`) and prompt construction. Each spec bundles everything required for a given kind: display metadata, card schema, count range, and prompt builder. The worker looks up the spec by kind and then becomes kind-agnostic — adding a new data type means adding one spec here plus one renderer on the client.

## Core exports / API
- `CardKindSpec`: interface for a complete single-kind spec
- `CARD_KIND_SPECS`: registry mapping kind id → spec (currently only `word`)
- `getCardKindSpec(kind)`: looks up the registry; throws for unknown kinds
- `resolveCount(spec, requested?)`: clamps a requested count to the kind's allowed range
- `CARD_REPAIR_INSTRUCTION`: retry instruction sent when the first model response violates the contract

## Dependencies
- Upstream: `cards/contract.ts` (wordCardSchema), `cards/types.ts`
- Downstream: `worker/cards/generate.ts`

## Key implementation notes
- Prompt text is in Chinese (product output targeting Chinese-speaking users); code and comments are in English (public-repo language rule)
- The `word` system prompt hard-constrains JSON structure, required fields, exact card count, and content quality (accurate spelling / phonetics / definitions and matching example sentences)
- The registry pattern fully decouples the generation pipeline from individual kinds

## Change history

### 2026-06-13 — Created
- **Motivation**: "different data → different cards" needed to be an extensible framework, not a word-only hard-code
- **Goal**: a spec registry that holds all generation knowledge for every kind
- **Key decisions**: prompt construction, schema, and count range are all encapsulated in `CardKindSpec` so the worker only knows about the spec, not the specific kind
