# worker/cards/generate.ts

## Responsibility
Card deck generation: drives the configured AI model with a kind-specific prompt, validates the response against that kind's contract, and retries once with a repair instruction on the first failure.

## Core exports / API
- `generateCardDeck(cfg, input)`: generates one `CardDeck`; throws if the model is unreachable or both attempts violate the contract

## Dependencies
- Upstream: `worker/ai/client.ts` (generateChatText), `worker/ai/settings.ts` (AiRuntimeConfig), `cards/contract.ts`, `cards/prompt.ts`, `cards/types.ts`
- Downstream: `worker/routes/cards.ts`

## Key implementation notes
- Reuses the same per-user provider configuration as the chat pipeline (same integration point as the research feature)
- Follows the pattern from `research/generate.ts`: parse first; on failure, retry with the previous bad response plus the `REPAIR` instruction
- `kind` and metadata are attached to the model payload in `finalize`

## Change history

### 2026-06-13 — Created
- **Motivation**: dynamic cards required a reliable path from LLM output to a validated deck
- **Goal**: a generic generation function that looks up the spec by kind to obtain the prompt and schema
- **Key decisions**: reuse `generateChatText` rather than instantiating a new model client; retain a single repair retry to improve robustness
