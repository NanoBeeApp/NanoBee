# cards/types.ts

## Responsibility
Shared domain types for the dynamic cards feature. Defines the data structures that embody the core product concept: the user names a data type they want to see, and the AI generates a matching-style card "deck". The framework is generic — each `kind` plugs in its own card shape, prompt, and renderer.

## Core exports / API
- `CardKind`: union type of registered card kinds (currently only `'word'`)
- `WordCard`: fields of a word card (word / phonetic / partOfSpeech / definition / translation / example / exampleTranslation / synonyms / mnemonic)
- `CardShapeByKind`: mapping from kind → card TypeScript shape
- `CardDeck<K>`: result of one generation run (kind + title + subtitle? + cards[] + metadata)
- `CardGenerationInput`: input parameters for one generation call (kind / topic? / count? / locale?)

## Dependencies
- Upstream: none (pure types)
- Downstream: `cards/contract.ts`, `cards/prompt.ts`, `worker/cards/generate.ts`, all `components/cards/*`

## Key implementation notes
- Platform-agnostic; shared between worker and client
- `CardShapeByKind` ensures `CardDeck<'word'>.cards` is typed as `WordCard[]`; adding a new kind automatically narrows types throughout

## Change history

### 2026-06-13 — Created
- **Motivation**: the user requested "dynamic card generation" as the core app feature — pick any data type and the AI generates cards in a matching style, with different styles for different data; word cards were the first kind to implement
- **Goal**: establish an extensible card-type framework with word cards as the first concrete kind
- **Key decisions**: discriminated structure keyed on kind rather than a separate hard-coded type for each data type; deck as the uniform envelope with card shape varying by kind
