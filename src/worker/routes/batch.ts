/**
 * /api/tasks/batch — batch task endpoints.
 *
 * All endpoints are owner-scoped (signed-in user id or "anon") and follow
 * the exact patterns established in routes/tasks.ts.
 *
 * Endpoints:
 *   POST   /api/tasks/batch/preview      — parse uploaded text, detect input column
 *   POST   /api/tasks/batch              — create parent task + subtasks
 *   GET    /api/tasks/batch/:id          — parent task + subtasks + progress
 *   POST   /api/tasks/batch/:id/run      — kick off / resume the runner
 *   POST   /api/tasks/batch/:id/retry-failed — reset failed rows and re-run
 *
 * The runner (batch-runner.ts) is always kicked via ctx.waitUntil() so it
 * survives the HTTP response on Cloudflare Workers.
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { nanoid } from "nanoid";
import type { Env } from "../api-worker";
import { ANON_OWNER, getTask } from "../db/repo";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";
import { resolveAiConfig } from "../ai/settings";
import { parseFileText, rejectXlsx } from "../batch/file-parser";
import { detectColumns } from "../batch/detect-columns";
import {
  createBatchSubtasks,
  listBatchSubtasks,
  getBatchProgress,
  resetFailedSubtasks,
} from "../batch/repo";
import { runBatch } from "../scheduler/batch-runner";

// ---------------------------------------------------------------------------
// Owner resolution (same helper used in routes/tasks.ts)
// ---------------------------------------------------------------------------

async function ownerOf(c: Context<{ Bindings: Env }>): Promise<string> {
  const token = getSessionToken(c);
  if (!token) return ANON_OWNER;
  const user = await getUserBySessionToken(c.env.DB, token);
  return user?.id ?? ANON_OWNER;
}

/** Resolve userId (null for anon) — needed for AI config resolution. */
async function userIdOf(c: Context<{ Bindings: Env }>): Promise<string | null> {
  const token = getSessionToken(c);
  if (!token) return null;
  const user = await getUserBySessionToken(c.env.DB, token);
  return user?.id ?? null;
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const previewSchema = z.object({
  /**
   * Raw file text (CSV / TSV / TXT). The client reads the file via
   * FileReader.readAsText and sends it as a JSON string.
   * Max 2 MB as a UTF-8 string (~2 million chars).
   */
  text: z.string().min(1).max(2_000_000),
  /** Original filename — used for extension-based format detection. */
  filename: z.string().max(255).optional(),
});

const createSchema = z.object({
  /** User-facing title for the parent batch task. */
  title: z.string().min(1).max(100),
  /** Topic bucket (mirrors the task.topicId field). */
  topicId: z.string().min(1).max(40),
  /** Raw file text (same as preview). */
  text: z.string().min(1).max(2_000_000),
  /** Original filename for format detection. */
  filename: z.string().max(255).optional(),
  /** 0-based index of the input column the user confirmed. */
  inputColumnIndex: z.number().int().min(0),
  /** The per-row action description (≤ 200 chars). */
  action: z.string().min(1).max(200),
});

const runSchema = z.object({
  /** Optional: re-run from the top even if some rows are done. Default false. */
  force: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Route implementations
// ---------------------------------------------------------------------------

export const batchRoutes = new Hono<{ Bindings: Env }>()

  /**
   * POST /api/tasks/batch/preview
   * Parse the uploaded file text and return:
   *  - parsed headers + first 5 data rows (for the UI to display)
   *  - AI-detected input column + suggested action (for the UI to confirm)
   */
  .post("/preview", zValidator("json", previewSchema), async (c) => {
    const { text, filename } = c.req.valid("json");
    console.log("[API] POST /api/tasks/batch/preview, filename:", filename);

    // Reject .xlsx immediately.
    if (filename?.toLowerCase().endsWith(".xlsx")) {
      rejectXlsx(filename); // throws
    }

    let parsed;
    try {
      parsed = parseFileText(text, filename, 5000);
    } catch (err) {
      return c.json({ error: String(err) }, 400);
    }

    if (parsed.rows.length === 0) {
      return c.json({ error: "File contains no data rows." }, 400);
    }

    // Resolve AI config for column detection.
    const userId = await userIdOf(c);
    const cfg = await resolveAiConfig(c.env, userId);

    let detection;
    try {
      detection = await detectColumns(cfg, parsed);
    } catch (err) {
      console.warn("[API] batch/preview detectColumns failed:", String(err));
      detection = {
        inputColumnIndex: 0,
        inputColumnName: parsed.headers[0] ?? "Column 1",
        suggestedAction: "Process each row",
        fromAi: false,
      };
    }

    // Return the first 5 preview rows for display.
    const previewRows = parsed.rows.slice(0, 5).map((r) => ({
      fields: r.fields,
      lineNum: r.lineNum,
    }));

    return c.json({
      format: parsed.format,
      headers: parsed.headers,
      hasHeader: parsed.hasHeader,
      totalRows: parsed.rows.length,
      rawLineCount: parsed.rawLineCount,
      previewRows,
      detection,
    });
  })

  /**
   * POST /api/tasks/batch
   * Create a parent batch task + all subtask rows, then kick off the runner.
   */
  .post("/", zValidator("json", createSchema), async (c) => {
    const { title, topicId, text, filename, inputColumnIndex, action } = c.req.valid("json");
    console.log("[API] POST /api/tasks/batch, title:", title);

    // Reject .xlsx.
    if (filename?.toLowerCase().endsWith(".xlsx")) {
      rejectXlsx(filename);
    }

    let parsed;
    try {
      parsed = parseFileText(text, filename, 5000);
    } catch (err) {
      return c.json({ error: String(err) }, 400);
    }

    if (parsed.rows.length === 0) {
      return c.json({ error: "File contains no data rows." }, 400);
    }

    if (inputColumnIndex >= parsed.headers.length) {
      return c.json({ error: "inputColumnIndex out of range." }, 400);
    }

    // Extract the per-row inputs.
    const inputs = parsed.rows
      .map((r) => (r.fields[inputColumnIndex] ?? "").trim())
      .filter((v) => v.length > 0);

    if (inputs.length === 0) {
      return c.json({ error: "Selected column has no non-empty values." }, 400);
    }

    const owner = await ownerOf(c);

    // Generate the parent task id inside the handler (nanoid() must not be at
    // module top-level — Workers deploy validation rule).
    const batchId = `t_batch_${nanoid(10)}`;

    // Build the display payload for the parent task (stored in tasks.payload).
    const now = Math.floor(Date.now() / 1000);
    const displayPayload: Record<string, unknown> = {
      iconColor: "#f59e0b", // amber — the NanoBee proactive accent
      triggerType: "condition",
      trigger: `${inputs.length} 行`,
      last: "刚刚创建",
      next: "执行中",
      desc: action,
      kind: "batch",
      runState: "running",
      batchAction: action, // used by the runner to know what to do per row
      // Initial batch progress: the runner updates this after each chunk.
      batch: {
        total: inputs.length,
        done: 0,
        failed: 0,
        subtasks: [], // subtasks live in the batch_subtasks table, not the payload
      },
    };

    try {
      // Insert the parent task row.
      await c.env.DB.prepare(
        `INSERT INTO tasks
           (id, owner, topic_id, title, status, payload, created_at)
         VALUES (?, ?, ?, ?, 'active', ?, ?)`,
      )
        .bind(batchId, owner, topicId, title, JSON.stringify(displayPayload), now)
        .run();

      // Insert all subtask rows.
      await createBatchSubtasks(c.env.DB, owner, batchId, inputs);
    } catch (err) {
      console.error("[API] POST /api/tasks/batch D1 error:", String(err));
      return c.json({ error: "Database error" }, 500);
    }

    // Kick off the runner via ctx.waitUntil so it survives the response.
    // Pass executionCtx so runBatch can self-chain for batches larger than CHUNK_SIZE.
    c.executionCtx.waitUntil(
      runBatch(c.env, batchId, owner, c.executionCtx).catch((e) =>
        console.error("[batch] runner failed for", batchId, String(e)),
      ),
    );

    return c.json({ batchId, title, rowCount: inputs.length }, 201);
  })

  /**
   * GET /api/tasks/batch/:id
   * Return the parent task + all subtasks + aggregated progress counts.
   */
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const owner = await ownerOf(c);
    console.log("[API] GET /api/tasks/batch/:id:", id);

    try {
      // Load the parent task (scoped to owner).
      const task = await getTask(c.env.DB, id, owner);
      if (!task) return c.json({ error: "Batch not found" }, 404);

      // Load subtasks and progress (owner passed for defence-in-depth scoping).
      const [subtasks, progress] = await Promise.all([
        listBatchSubtasks(c.env.DB, owner, id),
        getBatchProgress(c.env.DB, id, owner),
      ]);

      // Map to the wire shape the UI expects.
      const subtaskPayload = subtasks.map((s) => ({
        id: s.id,
        input: s.input_text,
        status: mapStatus(s.status),
        result: s.result_text ?? s.error_text ?? undefined,
        attempts: s.attempts,
      }));

      return c.json({
        task: {
          ...task,
          batch: {
            total: progress.total,
            done: progress.done,
            failed: progress.failed,
            pending: progress.pending,
            running: progress.running,
            subtasks: subtaskPayload,
          },
        },
        progress,
      });
    } catch (err) {
      console.error("[API] GET /api/tasks/batch/:id D1 error:", String(err));
      return c.json({ error: "Database error" }, 500);
    }
  })

  /**
   * POST /api/tasks/batch/:id/run
   * Kick off (or resume) the batch runner. Idempotent when no pending rows remain.
   */
  .post("/:id/run", zValidator("json", runSchema.optional()), async (c) => {
    const id = c.req.param("id");
    const owner = await ownerOf(c);
    console.log("[API] POST /api/tasks/batch/:id/run:", id);

    try {
      const task = await getTask(c.env.DB, id, owner);
      if (!task) return c.json({ error: "Batch not found" }, 404);

      // Kick off the runner via waitUntil (pass ctx for self-chaining).
      c.executionCtx.waitUntil(
        runBatch(c.env, id, owner, c.executionCtx).catch((e) =>
          console.error("[batch] runner failed for", id, String(e)),
        ),
      );

      const progress = await getBatchProgress(c.env.DB, id, owner);
      return c.json({ ok: true, progress });
    } catch (err) {
      console.error("[API] POST /api/tasks/batch/:id/run D1 error:", String(err));
      return c.json({ error: "Database error" }, 500);
    }
  })

  /**
   * POST /api/tasks/batch/:id/retry-failed
   * Reset all failed subtasks back to pending and kick off the runner again.
   */
  .post("/:id/retry-failed", async (c) => {
    const id = c.req.param("id");
    const owner = await ownerOf(c);
    console.log("[API] POST /api/tasks/batch/:id/retry-failed:", id);

    try {
      const task = await getTask(c.env.DB, id, owner);
      if (!task) return c.json({ error: "Batch not found" }, 404);

      const resetCount = await resetFailedSubtasks(c.env.DB, owner, id);
      console.log("[batch] reset", resetCount, "failed subtasks to pending for batch:", id);

      if (resetCount === 0) {
        return c.json({ ok: true, resetCount: 0, message: "No failed subtasks to retry." });
      }

      // Kick off the runner (pass ctx for self-chaining).
      c.executionCtx.waitUntil(
        runBatch(c.env, id, owner, c.executionCtx).catch((e) =>
          console.error("[batch] runner failed for", id, String(e)),
        ),
      );

      return c.json({ ok: true, resetCount });
    } catch (err) {
      console.error("[API] POST /api/tasks/batch/:id/retry-failed D1 error:", String(err));
      return c.json({ error: "Database error" }, 500);
    }
  });

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

/**
 * Map DB status values to the UI's SubTaskStatus enum.
 * DB: pending | running | done | failed
 * UI: queued  | running | success | failed
 */
function mapStatus(
  dbStatus: string,
): "queued" | "running" | "success" | "failed" {
  switch (dbStatus) {
    case "pending":
      return "queued";
    case "running":
      return "running";
    case "done":
      return "success";
    case "failed":
      return "failed";
    default:
      return "queued";
  }
}
