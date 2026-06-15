// Artifacts API:
//   GET    /api/artifacts        — list the owner's artifacts (newest first)
//   GET    /api/artifacts/:id    — load one artifact (full deck)
//   DELETE /api/artifacts/:id    — delete one artifact
//
// Artifacts are created indirectly, by the chat agent's create_card_artifact
// tool (see agent/card-artifact-tools.ts) — there is no create endpoint here.
// Scoped to the signed-in user, or an "anon" bucket for signed-out visitors.

import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../api-worker";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";
import {
  ANON_OWNER,
  deleteArtifact,
  getArtifact,
  listArtifacts,
  setArtifactFavorited,
} from "../artifacts/repo";

/** Resolve the owner bucket: the signed-in user id, or the anon bucket. */
async function ownerOf(c: Context<{ Bindings: Env }>): Promise<string> {
  const token = getSessionToken(c);
  if (!token) return ANON_OWNER;
  const user = await getUserBySessionToken(c.env.DB, token);
  return user?.id ?? ANON_OWNER;
}

export const artifactRoutes = new Hono<{ Bindings: Env }>()
  .get("/", async (c) => {
    try {
      const owner = await ownerOf(c);
      const artifacts = await listArtifacts(c.env.DB, owner);
      return c.json({ artifacts });
    } catch (error) {
      console.error("[API] GET /api/artifacts error:", String(error));
      return c.json({ error: "Database error" }, 500);
    }
  })
  .get("/:id", async (c) => {
    try {
      const owner = await ownerOf(c);
      const artifact = await getArtifact(c.env.DB, owner, c.req.param("id"));
      if (!artifact) return c.json({ error: "Not found" }, 404);
      return c.json({ artifact });
    } catch (error) {
      console.error("[API] GET /api/artifacts/:id error:", String(error));
      return c.json({ error: "Database error" }, 500);
    }
  })
  .post(
    "/:id/favorite",
    // The client sends the desired state so the toggle is idempotent and free of
    // read-modify-write races.
    zValidator("json", z.object({ favorited: z.boolean() })),
    async (c) => {
      try {
        const owner = await ownerOf(c);
        const { favorited } = c.req.valid("json");
        const result = await setArtifactFavorited(
          c.env.DB,
          owner,
          c.req.param("id"),
          favorited,
        );
        if (result === null) return c.json({ error: "Not found" }, 404);
        return c.json({ favorited: result });
      } catch (error) {
        console.error("[API] POST /api/artifacts/:id/favorite error:", String(error));
        return c.json({ error: "Database error" }, 500);
      }
    },
  )
  .delete("/:id", async (c) => {
    try {
      const owner = await ownerOf(c);
      await deleteArtifact(c.env.DB, owner, c.req.param("id"));
      return c.json({ ok: true });
    } catch (error) {
      console.error("[API] DELETE /api/artifacts/:id error:", String(error));
      return c.json({ error: "Database error" }, 500);
    }
  });
