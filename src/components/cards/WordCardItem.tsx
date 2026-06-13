// Renderer for one "word" card. Pure presentation — receives a WordCard and
// lays it out: headword + phonetic + POS on top, the Chinese gloss as the
// headline meaning, English definition, an example sentence with its
// translation, and optional synonyms + a memory hook. Display-only for now;
// interaction (flip / mark-known / pronounce) comes later.
import { Icons } from '../../icons/icons';
import type { WordCard } from '../../cards/types';

interface Props {
  card: WordCard;
  index: number;
}

export function WordCardItem({ card, index }: Props) {
  return (
    <article className="nb-wordcard" data-testid={`word-card-${index}`}>
      <header className="nb-wordcard-head">
        <div className="nb-wordcard-headline">
          <h3 className="nb-wordcard-word">{card.word}</h3>
          {card.partOfSpeech && <span className="nb-wordcard-pos">{card.partOfSpeech}</span>}
        </div>
        {card.phonetic && <div className="nb-wordcard-phonetic">{card.phonetic}</div>}
      </header>

      <p className="nb-wordcard-translation">{card.translation}</p>
      <p className="nb-wordcard-definition">{card.definition}</p>

      <div className="nb-wordcard-example">
        <span className="nb-wordcard-example-mark"><Icons.book size={13} /></span>
        <div>
          <p className="nb-wordcard-example-en">{card.example}</p>
          {card.exampleTranslation && (
            <p className="nb-wordcard-example-zh">{card.exampleTranslation}</p>
          )}
        </div>
      </div>

      {card.synonyms && card.synonyms.length > 0 && (
        <div className="nb-wordcard-synonyms" data-testid={`word-card-synonyms-${index}`}>
          {card.synonyms.map((syn) => (
            <span key={syn} className="nb-wordcard-syn">{syn}</span>
          ))}
        </div>
      )}

      {card.mnemonic && (
        <div className="nb-wordcard-mnemonic">
          <Icons.spark size={13} />
          <span>{card.mnemonic}</span>
        </div>
      )}
    </article>
  );
}
