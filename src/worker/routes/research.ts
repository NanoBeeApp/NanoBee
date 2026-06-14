// Research Canvas API:
//  POST   /api/research/generate            — generate one node (outline/content)
//  GET    /api/research/projects            — list the owner's projects
//  GET    /api/research/snapshots/:id       — load one project snapshot
//  POST   /api/research/snapshots           — save a project snapshot
//  DELETE /api/research/projects/:id        — delete a project
//
// Generation reuses the same per-user AI provider config as chat, so a user's
// configured model powers both features. Projects are scoped to the signed-in
// user, or an "anon" bucket for signed-out visitors.

import { Hono } from "hono";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../api-worker";
import { resolveAiConfig } from "../ai/settings";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";
import { generateResearchNode, generateResearchNodeStream } from "../research/generate";
import {
  ANON_OWNER,
  deleteResearchProject,
  listResearchProjects,
  loadResearchSnapshot,
  saveResearchSnapshot,
} from "../research/repo";
import type { ResearchSnapshot } from "../../research/types";

/** Resolve the owner bucket: the signed-in user id, or the anon bucket. */
async function ownerOf(c: Context<{ Bindings: Env }>): Promise<string> {
  const token = getSessionToken(c);
  if (!token) return ANON_OWNER;
  const user = await getUserBySessionToken(c.env.DB, token);
  return user?.id ?? ANON_OWNER;
}

const generateSchema = z.object({
  topic: z.string().trim().min(1).max(200),
  question: z.string().trim().min(1).max(400).optional(),
  context: z.string().trim().max(8000).optional(),
  focusTerm: z.string().trim().min(1).max(200).optional(),
  generationMode: z.enum(["outline", "content"]).optional(),
  locale: z.string().trim().min(2).max(10).optional(),
});

// Full node schema (matches the client's ResearchNode), so unknown fields are
// dropped rather than persisted and the RPC body type matches ResearchSnapshot.
const nodeSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  depth: z.number(),
  title: z.string(),
  brief: z.string().optional(),
  summary: z.string().optional(),
  content: z.string().optional(),
  questions: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["idle", "loading", "ready", "failed"]),
  isRoot: z.boolean().optional(),
  needsContent: z.boolean().optional(),
  sourceQuestion: z.string().optional(),
});

const snapshotSchema = z.object({
  projectId: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(200),
  topic: z.string().trim().min(1).max(200),
  nodes: z.record(z.string(), nodeSchema),
  order: z.array(z.string()),
  updatedAt: z.string(),
});

export const researchRoutes = new Hono<{ Bindings: Env }>()
  .post("/generate", zValidator("json", generateSchema), async (c) => {
    const input = c.req.valid("json");
    console.log("[API] POST /api/research/generate, topic:", input.topic, "mode:", input.generationMode ?? (input.question ? "content" : "outline"));
    try {
      const token = getSessionToken(c);
      const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
      const aiConfig = await resolveAiConfig(c.env, user?.id ?? null);
      if (!aiConfig.apiKey) {
        return c.json({ error: "No AI provider configured" }, 400);
      }
      const result = await generateResearchNode(aiConfig, input);
      return c.json(result);
    } catch (error) {
      console.error("[API] POST /api/research/generate failed:", String(error));
      return c.json({ error: "Generation failed" }, 502);
    }
  })
  // Streaming sibling of /generate (content mode): emits `token` events as the
  // article body streams, then a `final` event with the validated result, or an
  // `error` event. Tokens are JSON-encoded so newlines never break SSE framing.
  // Config is checked BEFORE opening the stream — an opened SSE response can no
  // longer change its HTTP status, so a missing provider returns a clean 400.
  .post("/generate-stream", zValidator("json", generateSchema), async (c) => {
    const input = c.req.valid("json");
    console.log("[API] POST /api/research/generate-stream, topic:", input.topic);
    const token = getSessionToken(c);
    const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
    const aiConfig = await resolveAiConfig(c.env, user?.id ?? null);
    if (!aiConfig.apiKey) {
      return c.json({ error: "No AI provider configured" }, 400);
    }
    return streamSSE(c, async (stream) => {
      try {
        const result = await generateResearchNodeStream(aiConfig, input, (delta) =>
          stream.writeSSE({ event: "token", data: JSON.stringify(delta) }),
        );
        await stream.writeSSE({ event: "final", data: JSON.stringify(result) });
      } catch (error) {
        console.error("[API] POST /api/research/generate-stream failed:", String(error));
        await stream.writeSSE({ event: "error", data: JSON.stringify(String(error).slice(0, 300)) });
      }
    });
  })
  .get("/projects", async (c) => {
    try {
      const owner = await ownerOf(c);
      const projects = await listResearchProjects(c.env.DB, owner);
      return c.json({ projects });
    } catch (error) {
      console.error("[API] GET /api/research/projects error:", String(error));
      return c.json({ error: "Database error" }, 500);
    }
  })
  .get("/snapshots/:id", async (c) => {
    try {
      const owner = await ownerOf(c);
      const snapshot = await loadResearchSnapshot(c.env.DB, owner, c.req.param("id"));
      if (!snapshot) return c.json({ error: "Not found" }, 404);
      return c.json({ snapshot });
    } catch (error) {
      console.error("[API] GET /api/research/snapshots error:", String(error));
      return c.json({ error: "Database error" }, 500);
    }
  })
  .post("/snapshots", zValidator("json", snapshotSchema), async (c) => {
    const snapshot = c.req.valid("json") as ResearchSnapshot;
    try {
      const owner = await ownerOf(c);
      await saveResearchSnapshot(c.env.DB, owner, snapshot);
      return c.json({ ok: true, projectId: snapshot.projectId }, 201);
    } catch (error) {
      console.error("[API] POST /api/research/snapshots error:", String(error));
      return c.json({ error: "Database error" }, 500);
    }
  })
  .delete("/projects/:id", async (c) => {
    try {
      const owner = await ownerOf(c);
      await deleteResearchProject(c.env.DB, owner, c.req.param("id"));
      return c.json({ ok: true });
    } catch (error) {
      console.error("[API] DELETE /api/research/projects error:", String(error));
      return c.json({ error: "Database error" }, 500);
    }
  });
