// Deck renderer — the single switch point that maps a deck's `kind` to its
// per-kind card renderer. This is the generic seam of the Dynamic Card feature:
// adding a new data type means adding one more case here plus its item
// component, with no change to the view or the generation pipeline.
import type { CardDeck, WordCard } from '../../cards/types';
import { WordCardItem } from './WordCardItem';

interface Props {
  deck: CardDeck;
}

export function CardDeckRenderer({ deck }: Props) {
  switch (deck.kind) {
    case 'word':
      return (
        <div className="nb-deck-grid" data-testid="word-deck-grid">
          {(deck.cards as WordCard[]).map((card, i) => (
            <WordCardItem key={`${card.word}-${i}`} card={card} index={i} />
          ))}
        </div>
      );
    default:
      // Exhaustive today; keeps the switch honest as kinds are added.
      return null;
  }
}
