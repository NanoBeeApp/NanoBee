/**
 * D1 repository for the task_runs table (migration 0019).
 *
 * Provides insert / list / count helpers. All queries are owner-scoped so
 * run history can never leak across account boundaries.
 *
 * IMPORTANT: nanoid() / Date.now() / new Date() must only be called inside
 * function scope — never at module/global level (Workers deploy validation).
 */

import { nanoid } from "nanoid";
import type { D1Database } from "@cloudflare/workers-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskRunStatus = "ok" | "failed" | "skipped";

export interface TaskRunRow {
  id: string;
  owner: string;
  task_id: string;
  started_at: number;
  finished_at: number | null;
  status: TaskRunStatus;
  summary_text: string | null;
  error_text: string | null;
  detail_json: string | null;
}

/** Minimal shape used when inserting a new run row. */
export interface CreateTaskRunInput {
  owner: string;
  taskId: string;
  /** Unix seconds. Defaults to unixepoch() if omitted. */
  startedAt?: number;
  /** Unix seconds. NULL = still in progress. */
  finishedAt?: number | null;
  status: TaskRunStatus;
  summaryText?: string | null;
  errorText?: string | null;
  /** Optional JSON blob for diagnostic context. */
  detailJson?: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

/**
 * Maximum number of run-history rows kept per task.
 * After every insert we prune the oldest rows above this cap so the table
 * stays bounded even for long-running condition tasks that fire frequently.
 * 200 rows = ~40 days of history at a 4-hour cooldown, or ~10 days at 1-hour.
 */
const MAX_RUNS_PER_TASK = 200;

/**
 * Insert a completed task run row and return its generated id.
 * All times are unix seconds (unixepoch() precision).
 *
 * After inserting, lazily prunes old rows for this task above MAX_RUNS_PER_TASK
 * so the table never grows unbounded. The prune DELETE is best-effort (failure
 * is logged but does not fail the insert).
 */
export async function createTaskRun(
  db: D1Database,
  input: CreateTaskRunInput,
): Promise<string> {
  const id = `run_${nanoid(12)}`;
  const now = Math.floor(Date.now() / 1000);
  const startedAt = input.startedAt ?? now;
  const finishedAt = input.finishedAt ?? now;
  const detailStr = input.detailJson ? JSON.stringify(input.detailJson) : null;
  const summaryText = input.summaryText ? input.summaryText.slice(0, 280) : null;
  const errorText = input.errorText ? input.errorText.slice(0, 1000) : null;

  await db
    .prepare(
      `INSERT INTO task_runs
         (id, owner, task_id, started_at, finished_at, status, summary_text, error_text, detail_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.owner,
      input.taskId,
      startedAt,
      finishedAt,
      input.status,
      summaryText,
      errorText,
      detailStr,
    )
    .run();

  // Lazy prune: delete the oldest rows beyond the cap. Uses a subquery so only
  // rows for this specific task are affected. Best-effort — a failure here must
  // not propagate to the caller.
  db.prepare(
    `DELETE FROM task_runs
     WHERE owner = ? AND task_id = ?
       AND id NOT IN (
         SELECT id FROM task_runs
         WHERE owner = ? AND task_id = ?
         ORDER BY started_at DESC
         LIMIT ?
       )`,
  )
    .bind(input.owner, input.taskId, input.owner, input.taskId, MAX_RUNS_PER_TASK)
    .run()
    .catch((e: unknown) =>
      console.warn("[task-runs] prune failed for task", input.taskId, String(e)),
    );

  return id;
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

/**
 * List recent runs for a task, newest first.
 *
 * @param db       D1 database binding.
 * @param owner    Owner bucket (user id or "anon") — mandatory.
 * @param taskId   Task primary key.
 * @param limit    Max rows to return (default 20, max 100).
 * @param offset   Pagination offset (default 0).
 */
export async function listTaskRuns(
  db: D1Database,
  owner: string,
  taskId: string,
  limit = 20,
  offset = 0,
): Promise<TaskRunRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const { results } = await db
    .prepare(
      `SELECT id, owner, task_id, started_at, finished_at, status,
              summary_text, error_text, detail_json
       FROM task_runs
       WHERE owner = ? AND task_id = ?
       ORDER BY started_at DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(owner, taskId, safeLimit, offset)
    .all<TaskRunRow>();
  return results ?? [];
}

/**
 * Count total runs for a task (for pagination metadata).
 */
export async function countTaskRuns(
  db: D1Database,
  owner: string,
  taskId: string,
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM task_runs WHERE owner = ? AND task_id = ?`,
    )
    .bind(owner, taskId)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}
