// State hook for the Dynamic Card view: holds the current deck, loading/error
// flags, and a `generate` action that calls POST /api/cards/generate via the
// typed RPC client. Kept separate from the view so the view is pure rendering.
import { useState, useCallback } from 'react';
import { apiClient } from '../../lib/api-client';
import type { CardDeck, CardGenerationInput } from '../../cards/types';

interface CardDeckState {
  deck: CardDeck | null;
  loading: boolean;
  error: string | null;
  generate: (input: CardGenerationInput) => Promise<void>;
}

export function useCardDeck(): CardDeckState {
  const [deck, setDeck] = useState<CardDeck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (input: CardGenerationInput) => {
    setLoading(true);
    setError(null);
    console.log('[cards] generate, kind:', input.kind, 'topic:', input.topic ?? '(none)');
    try {
      const res = await apiClient.cards.generate.$post({ json: input });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { deck: CardDeck };
      console.log('[cards] generated deck:', data.deck.title, '·', data.deck.cards.length, 'cards');
      setDeck(data.deck);
    } catch (err) {
      console.error('[cards] generate failed:', String(err));
      setError('生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  return { deck, loading, error, generate };
}
