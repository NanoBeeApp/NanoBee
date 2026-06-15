/**
 * Batch task runner.
 *
 * Processes pending subtasks for a batch task: for each row, performs the
 * configured action via the data hub or a direct LLM call, stores the result
 * or error, and updates the subtask status.
 *
 * Design constraints:
 *  - Bounded concurrency (CONCURRENCY_LIMIT subtasks at a time).
 *  - Each row failure is isolated — never aborts the entire batch.
 *  - Called via ctx.waitUntil() so it survives the HTTP response.
 *  - Short-circuits when the batch runs out of pending rows (idempotent).
 *  - nanoid() / Date.now() / new Date() MUST only be called inside function
 *    scope (Workers deploy validation rule).
 *  - If a Worker times out mid-run, stale 'running' rows are reset to 'pending'
 *    at the start of the next run call (resetStaleRunningSubtasks).
 *  - Records a task_runs row after each chunk (ok / failed) for observable history.
 *
 * Action execution strategy:
 *  - The batch action is stored in the parent task's payload as `batchAction`.
 *  - For each row we call the data-hub `websearch` source with a query formed
 *    from the action + the input value, then ask the LLM to summarize the
 *    result into one short sentence.
 *  - When the data-hub is unavailable we fall back to a pure LLM call (no
 *    external data).
 *  - Plain-language error text is stored on failure so the UI can surface it.
 *
 * Change history:
 *   2026-06-15  Added task_runs recording per batch chunk execution.
 */

import type { Env } from "../api-worker";
import type { D1Database, ExecutionContext } from "@cloudflare/workers-types";
import { generateChatText } from "../ai/client";
import { resolveAiConfig } from "../ai/settings";
import { invokeDataSource, isDataHubEnabled } from "../datahub/client";
import {
  listPendingSubtasks,
  markSubtaskRunning,
  markSubtaskDone,
  markSubtaskFailed,
  resetStaleRunningSubtasks,
  getBatchProgress,
  type BatchSubtaskRow,
} from "../batch/repo";
import { createTaskRun } from "../task-runs/repo";
import { formatErrorText } from "../task-runs/failure-explainer";

// ---------------------------------------------------------------------------
// Internal D1 helpers — operate on the raw payload JSON to avoid Task↔Record
// type conflicts (Task has no index signature).
// ---------------------------------------------------------------------------

/** Read the raw payload object for a task row (returns null if not found). */
async function readTaskPayload(
  db: D1Database,
  taskId: string,
  owner: string,
): Promise<Record<string, unknown> | null> {
  const row = await db
    .prepare("SELECT payload FROM tasks WHERE id = ? AND owner = ?")
    .bind(taskId, owner)
    .first<{ payload: string }>();
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Write an updated payload object back to a task row. */
async function writeTaskPayload(
  db: D1Database,
  taskId: string,
  owner: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await db
    .prepare("UPDATE tasks SET payload = ? WHERE id = ? AND owner = ?")
    .bind(JSON.stringify(payload), taskId, owner)
    .run();
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max subtasks processed in parallel per run invocation. */
const CONCURRENCY_LIMIT = 4;

/** Max subtasks to pick up per single run() call (chunk size).
 *  A large batch makes progress across multiple ctx.waitUntil invocations. */
const CHUNK_SIZE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Execute one subtask: lookup data for the input, ask the LLM to summarize.
 * Returns a short result string on success, throws on failure.
 */
async function executeSubtask(
  env: Env,
  input: string,
  action: string,
  owner: string,
): Promise<string> {
  // Resolve the AI config for this owner (falls back to the default key).
  const cfg = await resolveAiConfig(env, owner === "anon" ? null : owner);

  if (!cfg.apiKey) {
    throw new Error("No AI API key available — configure one in Settings.");
  }

  // Build the query for the data hub.
  const query = `${action}: ${input}`;

  let contextText = "";

  if (isDataHubEnabled(env)) {
    try {
      const params: Record<string, string | number | boolean> = { query };
      if (env.TAVILY_API_KEY) {
        params["tavily_api_key"] = env.TAVILY_API_KEY;
      }
      const result = await invokeDataSource(env, "websearch", params);
      if (result) {
        // Condense the search results into a context block for the LLM.
        const items = (result.items ?? []).slice(0, 5) as Array<{
          title?: string;
          snippet?: string;
          content?: string;
          url?: string;
        }>;
        contextText = items
          .map((item) => {
            const title = item.title ?? "";
            const body = item.snippet ?? item.content ?? "";
            return `${title}: ${body}`.trim();
          })
          .filter(Boolean)
          .join("\n");
      }
    } catch (err) {
      // Data hub call failed; fall through to LLM-only mode.
      console.warn("[batch-runner] data hub call failed:", String(err));
    }
  }

  // Ask the LLM for a concise summary.
  const systemPrompt =
    "You are a research assistant. Given an action and context, produce a concise " +
    "1-2 sentence result summary. Be factual and direct.";

  const userContent = contextText
    ? `Action: ${action}\nSubject: ${input}\n\nContext:\n${contextText}\n\nSummarize the result in 1-2 sentences.`
    : `Action: ${action}\nSubject: ${input}\n\nProvide a concise 1-2 sentence summary based on your knowledge.`;

  const result = await generateChatText(
    cfg,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    { maxTokens: 256, timeoutMs: 20_000 },
  );

  return result;
}

/**
 * Process one subtask row: mark running, execute, mark done or failed.
 * Never throws — all errors are captured as failed status.
 */
async function processSubtask(
  env: Env,
  db: D1Database,
  row: BatchSubtaskRow,
  action: string,
): Promise<void> {
  const { id, input_text, owner } = row;

  try {
    // CAS: only proceed if this invocation wins the claim. A concurrent runner
    // may have already claimed this row (race between two /run calls).
    // markSubtaskRunning returns true only when 1 row was updated.
    const claimed = await markSubtaskRunning(db, id);
    if (!claimed) {
      console.log("[batch-runner] subtask already claimed by another runner, skipping:", id);
      return;
    }
    const result = await executeSubtask(env, input_text, action, owner);
    await markSubtaskDone(db, id, result);
    console.log("[batch-runner] subtask done:", id);
  } catch (err) {
    const errorText = err instanceof Error ? err.message : String(err);
    await markSubtaskFailed(db, id, errorText).catch((e) => {
      console.error("[batch-runner] failed to mark subtask failed:", id, String(e));
    });
    console.warn("[batch-runner] subtask failed:", id, errorText.slice(0, 120));
  }
}

// ---------------------------------------------------------------------------
// Public runner function
// ---------------------------------------------------------------------------

/**
 * Run one processing chunk for a batch, then self-schedule the next chunk if
 * more pending rows remain.
 *
 * Picks up to CHUNK_SIZE pending subtasks and processes them with bounded
 * concurrency. Safe to call multiple times (idempotent on completed rows).
 *
 * Self-chaining: when `ctx` is provided and the batch still has pending rows
 * after this chunk, `runBatch` schedules itself via `ctx.waitUntil` so the
 * whole batch completes without manual re-triggering. This lets a 5000-row
 * batch run to completion across multiple Worker invocations automatically.
 *
 * @param env     Cloudflare Worker env bindings.
 * @param batchId The parent task id (tasks.id where kind='batch').
 * @param owner   Owner bucket (user id or "anon") for permission checks.
 * @param ctx     Optional Worker execution context. When provided, re-queues
 *                itself via waitUntil if the batch still has pending rows.
 */
export async function runBatch(
  env: Env,
  batchId: string,
  owner: string,
  ctx?: ExecutionContext,
): Promise<void> {
  const db = env.DB;
  const chunkStarted = Math.floor(Date.now() / 1000);

  console.log("[batch-runner] start for batch:", batchId);

  // Reset any rows that were left in 'running' state from a previous
  // interrupted invocation (e.g. Worker timeout).
  await resetStaleRunningSubtasks(db, batchId).catch((e) => {
    console.warn("[batch-runner] resetStaleRunning failed:", String(e));
  });

  // Resolve the batch action from the parent task payload.
  let batchAction = "Research and summarize";
  try {
    const payload = await readTaskPayload(db, batchId, owner);
    if (payload && typeof payload.batchAction === "string" && payload.batchAction) {
      batchAction = payload.batchAction;
    }
  } catch (err) {
    console.warn("[batch-runner] could not load parent task:", String(err));
  }

  // Process CHUNK_SIZE pending subtasks in this invocation.
  const pending = await listPendingSubtasks(db, batchId, CHUNK_SIZE);
  if (pending.length === 0) {
    console.log("[batch-runner] no pending subtasks for batch:", batchId);
    return;
  }

  console.log("[batch-runner] processing", pending.length, "subtasks");

  // Process with bounded concurrency using a simple pool.
  let chunkDone = 0;
  let chunkFailed = 0;
  let lastErr: unknown = null;

  for (let i = 0; i < pending.length; i += CONCURRENCY_LIMIT) {
    const slice = pending.slice(i, i + CONCURRENCY_LIMIT);
    const results = await Promise.allSettled(
      slice.map((row) => processSubtask(env, db, row, batchAction)),
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        chunkDone++;
      } else {
        chunkFailed++;
        lastErr = r.reason;
      }
    }
  }

  // Check if more rows remain — if so log it so the caller knows to re-kick.
  const progress = await getBatchProgress(db, batchId);
  console.log(
    "[batch-runner] progress for batch:",
    batchId,
    "| done:", progress.done,
    "| failed:", progress.failed,
    "| pending:", progress.pending,
    "| total:", progress.total,
  );

  // Update the parent task's payload with the latest progress counts so the
  // task list (bootstrap) shows an accurate progress bar without re-polling.
  // We read/write the raw payload JSON directly to avoid Task↔Record cast issues;
  // id/topicId/title/status live in columns and are NOT part of the payload blob.
  try {
    const existingPayload = await readTaskPayload(db, batchId, owner);
    if (existingPayload !== null) {
      const isDone = progress.pending === 0 && progress.running === 0;
      const patchedPayload: Record<string, unknown> = {
        ...existingPayload,
        runState: isDone ? (progress.failed === progress.total ? "failed" : "done") : "running",
        batch: {
          total: progress.total,
          done: progress.done,
          failed: progress.failed,
          // subtasks are not stored in the payload — they live in batch_subtasks table
          subtasks: [],
        },
      };
      await writeTaskPayload(db, batchId, owner, patchedPayload);
    }
  } catch (err) {
    // Non-critical: the batch subtasks table is the source of truth; the
    // payload update is just a cache for the task list progress bar.
    console.warn("[batch-runner] failed to update parent task payload:", String(err));
  }

  // Record one task_runs row per chunk execution summarising the outcome.
  const chunkFinished = Math.floor(Date.now() / 1000);
  const runStatus = chunkFailed > 0 && chunkDone === 0 ? "failed" : "ok";
  const summaryText =
    chunkFailed === 0
      ? `Processed ${chunkDone} subtask${chunkDone === 1 ? "" : "s"} successfully.`
      : `Processed ${chunkDone + chunkFailed} subtasks: ${chunkDone} succeeded, ${chunkFailed} failed.`;

  await createTaskRun(db, {
    owner,
    taskId: batchId,
    startedAt: chunkStarted,
    finishedAt: chunkFinished,
    status: runStatus,
    summaryText,
    errorText:
      chunkFailed > 0 && lastErr
        ? formatErrorText(lastErr, { taskKind: "batch" })
        : null,
    detailJson: {
      chunkDone,
      chunkFailed,
      batchTotal: progress.total,
      batchDone: progress.done,
      batchFailed: progress.failed,
      batchPending: progress.pending,
    },
  }).catch((e) => console.warn("[batch-runner] failed to record task run:", String(e)));

  if (progress.pending > 0) {
    if (ctx) {
      // Self-chain: schedule the next chunk so the whole batch runs to completion
      // without any manual re-triggering. Each ctx.waitUntil call extends the
      // Worker lifetime to let the next chunk finish.
      console.log(
        "[batch-runner] batch has", progress.pending, "pending rows — scheduling next chunk via waitUntil",
      );
      ctx.waitUntil(
        runBatch(env, batchId, owner, ctx).catch((e) =>
          console.error("[batch-runner] next-chunk error for", batchId, String(e)),
        ),
      );
    } else {
      console.log(
        "[batch-runner] batch has", progress.pending,
        "pending rows; no ctx provided — caller must re-trigger /run to continue",
      );
    }
  }
}
