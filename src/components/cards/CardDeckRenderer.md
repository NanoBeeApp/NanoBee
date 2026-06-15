# components/cards/CardDeckRenderer.tsx

## Responsibility
Deck renderer — the single switch point that maps a deck's `kind` to its renderer. This is the universal extension seam for the dynamic-cards feature: adding a new data type only requires a new `case` here plus a corresponding item component; neither the view layer nor the generation pipeline needs to change.

## Core exports / API
- `CardDeckRenderer({ deck })`

## Dependencies
- Upstream: `cards/types.ts`, `components/cards/WordCardItem.tsx`
- Downstream: `components/cards/CardsView.tsx`

## Key implementation notes
- Switches on `deck.kind`; the `word` case renders `WordCardItem` in a grid layout.
- The `default` returns `null`, keeping the switch explicit when a new `kind` is added.

## Change history

### 2026-06-13 — created
- **Motivation**: a centralized place was needed to decide "which card style does this kind use".
- **Goal**: make card styles pluggable per data type.
- **Key decisions**: a single switch seam rather than scattered conditionals in the view; extensions touch only this one file.
