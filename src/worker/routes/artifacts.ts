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
  listDataViewItems,
  setArtifactFavorited,
  setPipelineStatus,
  updateDataViewMeta,
} from "../artifacts/repo";
import { runDataViewPipeline } from "../data-views/pipeline";

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
  // Data-view item stream (newest first). Empty for word artifacts / unknown ids.
  .get("/:id/items", async (c) => {
    try {
      const owner = await ownerOf(c);
      const limitRaw = Number(c.req.query("limit"));
      const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined;
      const items = await listDataViewItems(c.env.DB, owner, c.req.param("id"), limit);
      return c.json({ items, hasMore: false, nextCursor: null });
    } catch (error) {
      console.error("[API] GET /api/artifacts/:id/items error:", String(error));
      return c.json({ error: "Database error" }, 500);
    }
  })
  // Manually re-run a data view's fetch pipeline (background; returns immediately).
  .post("/:id/refresh", async (c) => {
    try {
      const owner = await ownerOf(c);
      const id = c.req.param("id");
      const artifact = await getArtifact(c.env.DB, owner, id);
      if (!artifact || artifact.kind !== "data_view") {
        return c.json({ error: "Not found" }, 404);
      }
      await setPipelineStatus(c.env.DB, id, "pending");
      const run = runDataViewPipeline(c.env, id, owner, artifact.query).catch((e) =>
        console.error("[API] refresh pipeline failed:", String(e)),
      );
      if (c.executionCtx?.waitUntil) c.executionCtx.waitUntil(run);
      else await run;
      return c.json({ ok: true, pipelineStatus: "pending" });
    } catch (error) {
      console.error("[API] POST /api/artifacts/:id/refresh error:", String(error));
      return c.json({ error: "Database error" }, 500);
    }
  })
  // Update a data view's editable meta (title / default view).
  .patch(
    "/:id",
    zValidator(
      "json",
      z.object({
        title: z.string().min(1).max(60).optional(),
        defaultView: z.enum(["list", "card", "table", "timeline"]).optional(),
      }),
    ),
    async (c) => {
      try {
        const owner = await ownerOf(c);
        const ok = await updateDataViewMeta(c.env.DB, owner, c.req.param("id"), c.req.valid("json"));
        if (!ok) return c.json({ error: "Not found" }, 404);
        return c.json({ ok: true });
      } catch (error) {
        console.error("[API] PATCH /api/artifacts/:id error:", String(error));
        return c.json({ error: "Database error" }, 500);
      }
    },
  )
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
