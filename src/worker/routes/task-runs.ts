/**
 * /api/tasks/:id/runs — task run history endpoint.
 *
 * Returns recent executions for a task, newest first.
 * All queries are owner-scoped: the caller can only see runs for tasks they
 * own (same pattern as routes/tasks.ts and routes/batch.ts).
 *
 * Endpoints:
 *   GET /api/tasks/:id/runs          — paginated run history
 *
 * Query params:
 *   limit   (optional, 1–100, default 20)
 *   offset  (optional, default 0)
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../api-worker";
import { ANON_OWNER, getTask } from "../db/repo";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";
import { listTaskRuns, countTaskRuns } from "../task-runs/repo";

// ---------------------------------------------------------------------------
// Owner resolution (same helper as tasks.ts / batch.ts)
// ---------------------------------------------------------------------------

async function ownerOf(c: Context<{ Bindings: Env }>): Promise<string> {
  const token = getSessionToken(c);
  if (!token) return ANON_OWNER;
  const user = await getUserBySessionToken(c.env.DB, token);
  return user?.id ?? ANON_OWNER;
}

// ---------------------------------------------------------------------------
// Query schema
// ---------------------------------------------------------------------------

const runsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(Math.max(parseInt(v, 10) || 20, 1), 100) : 20)),
  offset: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(parseInt(v, 10) || 0, 0) : 0)),
});

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const taskRunRoutes = new Hono<{ Bindings: Env }>()

  /**
   * GET /api/tasks/:id/runs
   *
   * Returns paginated run history for a task, newest first.
   * Response shape:
   * {
   *   runs: Array<{
   *     id, taskId, startedAt, finishedAt, status, summaryText, errorText
   *   }>,
   *   total: number,
   *   limit: number,
   *   offset: number,
   * }
   */
  .get("/:id/runs", zValidator("query", runsQuerySchema), async (c) => {
    const id = c.req.param("id");
    const { limit, offset } = c.req.valid("query");
    console.log("[API] GET /api/tasks/:id/runs, id:", id, "limit:", limit, "offset:", offset);

    try {
      const owner = await ownerOf(c);

      // Verify the task exists and is owned by the caller.
      const task = await getTask(c.env.DB, id, owner);
      if (!task) return c.json({ error: "Task not found" }, 404);

      const [runs, total] = await Promise.all([
        listTaskRuns(c.env.DB, owner, id, limit, offset),
        countTaskRuns(c.env.DB, owner, id),
      ]);

      // Strip out the raw detail_json blob for the wire response — it's
      // a diagnostic aid not needed by the UI. Expose only the human-readable
      // fields. Callers can request the raw row via a future ?detail=1 param.
      const wireRuns = runs.map((r) => ({
        id: r.id,
        taskId: r.task_id,
        startedAt: r.started_at,
        finishedAt: r.finished_at,
        status: r.status,
        summaryText: r.summary_text,
        errorText: r.error_text,
      }));

      return c.json({ runs: wireRuns, total, limit, offset });
    } catch (err) {
      console.error("[API] GET /api/tasks/:id/runs error:", String(err));
      return c.json({ error: "Database error" }, 500);
    }
  });
