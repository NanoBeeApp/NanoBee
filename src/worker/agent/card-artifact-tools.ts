// The `create_card_artifact` agent tool — the chat entry point of the Dynamic
// Card feature. When a chat message asks to *see / learn a set of data* (today:
// English vocabulary), the model calls this tool; it generates a card deck and
// persists it as an artifact. The tool's value is its side effect (a saved
// artifact that surfaces on the Artifacts page); the string it returns to the
// model is just a confirmation so the model can tell the user it is ready.
//
// The created artifact's reference is pushed onto the shared agent context so
// the request handler can attach it to the AI reply (an inline, clickable
// chat card). The tool is only offered when the request supplies artifact
// context (an owner + a sink), so signed-out/anon flows still work.

import { resolveAiConfig } from "../ai/settings";
import type { AgentContext, AgentTool } from "./tools";
import { generateCardDeck } from "../cards/generate";
import { createArtifact } from "../artifacts/repo";
import { getCardKindSpec } from "../../cards/prompt";
import type { CardKind } from "../../cards/types";

/** The single supported kind today; the enum widens as kinds are added. */
const SUPPORTED_KINDS: CardKind[] = ["word"];

/**
 * Build the artifact tool set. Returns the `create_card_artifact` tool when the
 * request carries artifact context, else an empty list (the model simply does
 * not see the tool).
 */
export function cardArtifactTools(ctx: AgentContext): AgentTool[] {
  const artifactCtx = ctx.artifacts;
  if (!artifactCtx) return [];

  const tool: AgentTool = {
    name: "create_card_artifact",
    description:
      "Generate a deck of display cards as a saved 'artifact' the user can browse on the Artifacts page. " +
      "Use this whenever the user wants to SEE or LEARN a set of data rendered as cards rather than as a plain chat answer — " +
      "for example: '每天教我10个单词' / 'teach me 10 English words' / '给我一组单词卡片'. " +
      "Today only the 'word' kind is supported (English vocabulary cards with phonetics, meanings, examples). " +
      "After calling it, briefly tell the user the cards are ready in the Artifacts page; do NOT re-list every card in your text.",
    parameters: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: SUPPORTED_KINDS,
          description: "The card kind. Only 'word' (English vocabulary) is available today.",
        },
        topic: {
          type: "string",
          description:
            "Optional theme to focus the cards, e.g. '情绪表达' / 'business English'. Omit for a general high-frequency set.",
        },
        count: {
          type: "number",
          description: "How many cards to generate (default 10).",
        },
      },
      required: ["kind"],
    },
    // Card generation is an LLM call (often 20-40s for a full deck); the
    // default 20s tool timeout would cut it off. Give it room.
    timeoutMs: 90_000,
    execute: async (args, env) => {
      const kind = (typeof args.kind === "string" ? args.kind : "word") as CardKind;
      if (!SUPPORTED_KINDS.includes(kind)) {
        throw new Error(`Unsupported card kind: ${kind}`);
      }
      const topic = typeof args.topic === "string" ? args.topic : undefined;
      const count = typeof args.count === "number" ? args.count : undefined;

      // Reuse the request's resolved AI config (same per-user provider as chat).
      const aiConfig = await resolveAiConfig(env, artifactCtx.owner === "anon" ? null : artifactCtx.owner);
      if (!aiConfig.apiKey) throw new Error("No AI provider configured for card generation");

      const deck = await generateCardDeck(aiConfig, { kind, topic, count });
      const artifact = await createArtifact(env.DB, artifactCtx.owner, deck, artifactCtx.chatId);

      // Surface the reference to the request handler (→ inline chat card).
      artifactCtx.created.push({
        id: artifact.id,
        kind: artifact.kind,
        title: artifact.title,
        cardCount: artifact.cardCount,
      });

      const label = getCardKindSpec(kind).label;
      return `Created a ${label} artifact "${deck.title}" with ${deck.cards.length} cards (id: ${artifact.id}). It is now available on the user's Artifacts page.`;
    },
  };

  return [tool];
}
