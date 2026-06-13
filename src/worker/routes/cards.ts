// Dynamic Card API:
//   POST /api/cards/generate — generate one card deck of a given kind
//
// Generation reuses the same per-user AI provider config as chat, so a user's
// configured model powers this feature too. Decks are display-only today (no
// persistence); interaction + saving come later.

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../api-worker";
import { resolveAiConfig } from "../ai/settings";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";
import { generateCardDeck } from "../cards/generate";

const generateSchema = z.object({
  kind: z.enum(["word"]),
  topic: z.string().trim().max(200).optional(),
  count: z.number().int().min(1).max(20).optional(),
  locale: z.string().trim().min(2).max(10).optional(),
});

export const cardRoutes = new Hono<{ Bindings: Env }>().post(
  "/generate",
  zValidator("json", generateSchema),
  async (c) => {
    const input = c.req.valid("json");
    console.log("[API] POST /api/cards/generate, kind:", input.kind, "topic:", input.topic ?? "(none)");
    try {
      const token = getSessionToken(c);
      const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
      const aiConfig = await resolveAiConfig(c.env, user?.id ?? null);
      if (!aiConfig.apiKey) {
        return c.json({ error: "No AI provider configured" }, 400);
      }
      const deck = await generateCardDeck(aiConfig, input);
      return c.json({ deck });
    } catch (error) {
      console.error("[API] POST /api/cards/generate failed:", String(error));
      return c.json({ error: "Generation failed" }, 502);
    }
  },
);
