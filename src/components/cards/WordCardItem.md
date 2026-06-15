# components/cards/WordCardItem.tsx

## Responsibility
Renderer for a single "word" card. Pure display component: the top section shows the word, phonetic transcription, and part of speech; the Chinese definition is the prominent primary gloss; below that is the English definition, then an example sentence with translation; optional synonyms and mnemonic follow. Interaction (flip, mark as learned, pronunciation) is left for a later iteration.

## Core exports / API
- `WordCardItem({ card, index })`

## Dependencies
- Upstream: `icons/icons.tsx`, `cards/types.ts` (WordCard)
- Downstream: `components/cards/CardDeckRenderer.tsx`

## Key implementation notes
- Pure render, stateless — driven entirely by props.
- Styles live in `styles/cards.css` (`.nb-wordcard*` classes).
- Each card and its sub-regions carry business-meaningful `data-testid` values (`word-card-{i}`, etc.).

## Change history

### 2026-06-13 — created
- **Motivation**: word data needs a dedicated card style (the first concrete landing of the "different data, different style" approach).
- **Goal**: a clear information hierarchy for phonetics / definitions / example sentences / mnemonics.
- **Key decisions**: the Chinese definition is elevated to the primary visual weight; the English definition is secondary; example sentences are visually separated by a light-background block.
