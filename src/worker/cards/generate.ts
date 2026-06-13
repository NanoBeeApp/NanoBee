// Card-deck generation: drive the configured AI model with a kind-specific
// prompt, validate the reply against that kind's contract, and retry once with
// a repair instruction if the first reply is malformed.
//
// Reuses NanoBee's existing chat client (`generateChatText`) so card generation
// rides on the same per-user provider settings as chat — the same "reuse the AI
// config" integration point the research feature uses.

import type { AiRuntimeConfig } from "../ai/settings";
import { generateChatText, type AiChatMessage } from "../ai/client";
import { parseDeckPayload } from "../../cards/contract";
import {
  CARD_REPAIR_INSTRUCTION,
  getCardKindSpec,
  resolveCount,
} from "../../cards/prompt";
import type { CardDeck, CardGenerationInput } from "../../cards/types";

/**
 * Generate one card deck. Throws if the model is unreachable or the reply
 * cannot be coerced into a contract-valid deck after one repair retry.
 */
export async function generateCardDeck(
  cfg: AiRuntimeConfig,
  input: CardGenerationInput,
): Promise<CardDeck> {
  const spec = getCardKindSpec(input.kind);
  const count = resolveCount(spec, input.count);
  const { system, user } = spec.buildMessages(input, count);
  const messages: AiChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  // Scale the completion ceiling to the deck size: each card is a few hundred
  // tokens of JSON, so the global chat cap (hundreds of tokens) would truncate
  // a multi-card deck mid-array. max_tokens is only a ceiling, so a generous
  // value costs nothing when the model finishes early.
  const maxTokens = Math.min(8000, 1000 + count * 360);
  // A full deck is a large completion; the default 30s chat timeout can clip a
  // 10+ card generation (especially under load or on a repair retry). Give the
  // long-form call a roomier ceiling.
  const timeoutMs = 90_000;

  let raw = await generateChatText(cfg, messages, { maxTokens, timeoutMs });
  try {
    return finalize(input.kind, parseDeckPayload(raw, spec.cardSchema), cfg);
  } catch (firstError) {
    // One repair attempt: re-send the prior (bad) reply + a strict instruction.
    console.warn(
      "[cards] first reply failed contract, retrying with repair:",
      String(firstError),
    );
    const repairMessages: AiChatMessage[] = [
      ...messages,
      { role: "assistant", content: raw } as AiChatMessage,
      {
        role: "user",
        content: `${CARD_REPAIR_INSTRUCTION}\n(Reason previous output failed: ${String(
          firstError,
        ).slice(0, 200)})`,
      },
    ];
    raw = await generateChatText(cfg, repairMessages, { maxTokens, timeoutMs });
    return finalize(input.kind, parseDeckPayload(raw, spec.cardSchema), cfg);
  }
}

function finalize(
  kind: CardGenerationInput["kind"],
  payload: { title: string; subtitle?: string; cards: unknown[] },
  cfg: AiRuntimeConfig,
): CardDeck {
  return {
    kind,
    title: payload.title,
    subtitle: payload.subtitle,
    cards: payload.cards as CardDeck["cards"],
    metadata: { provider: cfg.provider, model: cfg.model },
  };
}
