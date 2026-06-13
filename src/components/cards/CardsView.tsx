// Dynamic Card view — the app's core surface: pick the kind of data you want to
// see, optionally give it a theme, and the AI generates a deck of cards laid
// out specifically for that kind. Today the "word" kind is wired end to end;
// the kind picker is the extension point for future data types (Hacker News,
// stocks, weather…), each of which adds a catalog entry + a renderer.
//
// Display-only for now (no per-card interaction yet, by design).
import { useState } from 'react';
import { Icons } from '../../icons/icons';
import type { CardKind } from '../../cards/types';
import { useCardDeck } from './useCardDeck';
import { CardDeckRenderer } from './CardDeckRenderer';

/** Client-facing kind catalog (display metadata only; prompts live server-side). */
interface KindEntry {
  id: CardKind;
  label: string;
  hint: string;
  placeholder: string;
  defaultCount: number;
}

const KIND_CATALOG: KindEntry[] = [
  {
    id: 'word',
    label: '单词卡片',
    hint: '每天学一组英语单词，含音标、释义、例句与记忆法',
    placeholder: '可选主题，如「情绪表达」「商务英语」，留空则综合挑选',
    defaultCount: 10,
  },
];

export function CardsView() {
  const [kind, setKind] = useState<CardKind>('word');
  const [topic, setTopic] = useState('');
  const { deck, loading, error, generate } = useCardDeck();

  const active = KIND_CATALOG.find((k) => k.id === kind) ?? KIND_CATALOG[0];

  const onGenerate = () => {
    if (loading) return;
    void generate({ kind, topic: topic.trim() || undefined, count: active.defaultCount });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onGenerate();
  };

  return (
    <div className="nb-cards" data-testid="cards-view">
      <div className="nb-cards-scroll">
        <header className="nb-cards-head">
          <div className="nb-cards-title-row">
            <h1 className="nb-cards-title">动态卡片</h1>
            <p className="nb-cards-subtitle">想看什么数据，让 AI 现生成对应样式的卡片</p>
          </div>

          {/* Kind picker — one chip per registered card kind. */}
          <div className="nb-cards-kinds" data-testid="card-kind-picker">
            {KIND_CATALOG.map((k) => (
              <button
                key={k.id}
                className={`nb-cards-kind${k.id === kind ? ' active' : ''}`}
                onClick={() => setKind(k.id)}
                data-testid={`card-kind-${k.id}`}>
                <Icons.book size={15} />
                {k.label}
              </button>
            ))}
          </div>

          {/* Theme input + generate. */}
          <div className="nb-cards-compose">
            <input
              className="nb-cards-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={active.placeholder}
              data-testid="card-topic-input"
            />
            <button
              className="nb-cards-generate"
              onClick={onGenerate}
              disabled={loading}
              data-testid="card-generate-button">
              {loading ? <Icons.spark size={15} /> : <Icons.bolt size={15} />}
              {loading ? '生成中…' : '生成卡片'}
            </button>
          </div>
          <p className="nb-cards-hint">{active.hint}</p>
        </header>

        <div className="nb-cards-body">
          {error && (
            <div className="nb-cards-error" data-testid="card-error">{error}</div>
          )}

          {loading && !deck && (
            <div className="nb-cards-loading" data-testid="card-loading">
              <Icons.spark size={18} />
              <span>AI 正在为「{active.label}」生成卡片…</span>
            </div>
          )}

          {!loading && !deck && !error && (
            <div className="nb-cards-empty" data-testid="card-empty">
              <Icons.grid size={28} />
              <p>选择一种卡片，点「生成卡片」开始</p>
            </div>
          )}

          {deck && (
            <section data-testid="card-deck">
              <div className="nb-deck-head">
                <h2 className="nb-deck-title">{deck.title}</h2>
                {deck.subtitle && <p className="nb-deck-subtitle">{deck.subtitle}</p>}
              </div>
              <CardDeckRenderer deck={deck} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
