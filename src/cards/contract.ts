// AI output contract for the Dynamic Card feature: the strict JSON shape the
// model must return for a card deck, plus tolerant parsing. Generic over the
// per-kind card schema so every kind reuses the same envelope + parser.
//
// The model returns only `{ title, subtitle?, cards: [...] }`; the deck `kind`
// and `metadata` are attached server-side from the request/runtime config.

import { z } from "zod";
import type { ZodTypeAny } from "zod";

/** One word card, as the model must emit it (before server metadata). */
export const wordCardSchema = z.object({
  word: z.string().trim().min(1).max(48),
  phonetic: z.string().trim().max(64).optional(),
  partOfSpeech: z.string().trim().max(24).optional(),
  definition: z.string().trim().min(1).max(400),
  translation: z.string().trim().min(1).max(120),
  example: z.string().trim().min(1).max(400),
  exampleTranslation: z.string().trim().max(400).optional(),
  synonyms: z.array(z.string().trim().min(1).max(48)).max(8).optional(),
  mnemonic: z.string().trim().max(400).optional(),
});

/**
 * The raw deck payload the model returns, generic over the card schema.
 * `min(1)` guards against empty decks; the upper bound keeps one call bounded.
 */
export function deckPayloadSchema(cardSchema: ZodTypeAny) {
  return z.object({
    title: z.string().trim().min(1).max(120),
    subtitle: z.string().trim().min(1).max(200).optional(),
    cards: z.array(cardSchema).min(1).max(30),
  });
}

/**
 * Parse the model's raw text into a validated deck payload. Accepts a bare JSON
 * object or one embedded in surrounding prose (first `{...}` match). Throws if
 * no JSON is found or the payload violates the kind's card schema.
 */
export function parseDeckPayload<T>(
  rawContent: string,
  cardSchema: ZodTypeAny,
): { title: string; subtitle?: string; cards: T[] } {
  const trimmed = rawContent.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI provider did not return JSON content");
    parsed = JSON.parse(match[0]);
  }
  return deckPayloadSchema(cardSchema).parse(parsed) as {
    title: string;
    subtitle?: string;
    cards: T[];
  };
}
