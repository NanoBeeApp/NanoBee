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
import { RESEARCH_STYLE_IDS } from "../../research/styles";
import { resolveAiConfig } from "../ai/settings";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";
import {
  generateResearchNode,
  generateResearchNodeStream,
  ResearchGenerationError,
} from "../research/generate";
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
  focusParagraph: z.string().trim().min(1).max(2000).optional(),
  generationMode: z.enum(["outline", "content"]).optional(),
  locale: z.string().trim().min(2).max(10).optional(),
  style: z.enum(RESEARCH_STYLE_IDS).optional(),
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
  userQuestionTurns: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        answer: z.string(),
        status: z.enum(["idle", "loading", "ready", "failed"]),
      }),
    )
    .optional(),
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
      // Return the failure trace (if any) so the UI can still show how the
      // failed run unfolded — debugging matters most when generation fails.
      const trace = error instanceof ResearchGenerationError ? error.trace : null;
      return c.json({ error: "Generation failed", trace }, 502);
    }
  })
  // Streaming sibling of /generate (content + outline): emits a `start` event
  // immediately so the stream is open before the (slow) model call, then
  // `token` events as the body streams, then a `final` event with the
  // validated result, or an `error` event. A `ping` heartbeat keeps proxies
  // from closing the connection during a silent repair retry. Tokens are
  // JSON-encoded so newlines never break SSE framing. Config is checked BEFORE
  // opening the stream — an opened SSE response can no longer change its HTTP
  // status, so a missing provider returns a clean 400.
  .post("/generate-stream", zValidator("json", generateSchema), async (c) => {
    const input = c.req.valid("json");
    console.log("[API] POST /api/research/generate-stream, topic:", input.topic, "mode:", input.generationMode ?? (input.question ? "content" : "outline"));
    const token = getSessionToken(c);
    const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
    const aiConfig = await resolveAiConfig(c.env, user?.id ?? null);
    if (!aiConfig.apiKey) {
      return c.json({ error: "No AI provider configured" }, 400);
    }
    return streamSSE(c, async (stream) => {
      // Serialize writes so a heartbeat ping cannot interleave bytes with a
      // token/final/error frame. Keep the SSE connection alive during long
      // model calls and the non-streamed repair retry (no tokens for up to
      // CALL_OPTS.timeoutMs). `stream.sleep` is the Workers-safe wait.
      let beating = true;
      let writeChain = Promise.resolve();
      const writeEvent = (event: string, data: string) => {
        writeChain = writeChain
          .then(() => stream.writeSSE({ event, data }))
          .catch(() => undefined);
        return writeChain;
      };
      void (async () => {
        while (beating) {
          await stream.sleep(15_000);
          if (!beating) break;
          try {
            await writeEvent("ping", "{}");
          } catch {
            break;
          }
        }
      })();
      try {
        // First byte before the model call so proxies / the Worker itself
        // treat this as an open stream rather than a hung request. Outline
        // mode can sit silent for ~100s otherwise.
        await writeEvent("start", JSON.stringify({ ok: true }));
        const result = await generateResearchNodeStream(aiConfig, input, (delta) =>
          writeEvent("token", JSON.stringify(delta)),
        );
        await writeEvent("final", JSON.stringify(result));
      } catch (error) {
        console.error("[API] POST /api/research/generate-stream failed:", String(error));
        // Carry the failure trace (if any) on the error event so the client can
        // still surface how the failed run unfolded for debugging.
        const trace = error instanceof ResearchGenerationError ? error.trace : null;
        await writeEvent(
          "error",
          JSON.stringify({ message: String(error).slice(0, 300), trace }),
        );
      } finally {
        beating = false;
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
