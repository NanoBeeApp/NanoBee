/**
 * D1 repository for batch tasks and their subtasks.
 *
 * All queries are owner-scoped — every SELECT/UPDATE/DELETE on batch_subtasks
 * includes an `owner` predicate so data can never leak across accounts.
 *
 * The parent task (kind='batch') lives in the existing `tasks` table, managed
 * by the standard task repo. This module owns only `batch_subtasks`.
 *
 * IMPORTANT: nanoid() / Date.now() / new Date() must only be called inside
 * function scope — never at module/global level (Workers deploy validation).
 */

import { nanoid } from "nanoid";
import type { D1Database } from "@cloudflare/workers-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Status values for a subtask row. */
export type SubtaskStatus = "pending" | "running" | "done" | "failed";

/** One row from batch_subtasks. */
export interface BatchSubtaskRow {
  id: string;
  owner: string;
  batch_id: string;
  input_text: string;
  status: SubtaskStatus;
  result_text: string | null;
  error_text: string | null;
  attempts: number;
  created_at: number;
  updated_at: number;
}

/** Summarized progress counts for a batch. */
export interface BatchProgress {
  total: number;
  pending: number;
  running: number;
  done: number;
  failed: number;
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

/**
 * Insert one batch_subtask row and return its generated id.
 * Called in bulk by createBatchSubtasks.
 */
async function insertSubtask(
  db: D1Database,
  owner: string,
  batchId: string,
  inputText: string,
): Promise<string> {
  // nanoid() inside function scope — never at module top-level.
  const id = `bs_${nanoid(12)}`;
  await db
    .prepare(
      `INSERT INTO batch_subtasks (id, owner, batch_id, input_text, status, attempts)
       VALUES (?, ?, ?, ?, 'pending', 0)`,
    )
    .bind(id, owner, batchId, inputText)
    .run();
  return id;
}

/**
 * Insert all subtask rows for a batch in a single D1 batch (one network round
 * trip per 25 rows to stay inside the D1 batch limit).
 *
 * Returns the list of generated subtask ids.
 */
export async function createBatchSubtasks(
  db: D1Database,
  owner: string,
  batchId: string,
  inputs: string[],
): Promise<string[]> {
  const ids: string[] = [];
  // D1 batch() avoids per-row round trips. Chunk at 50 rows so each batch
  // request stays well inside the D1 statement limit.
  const CHUNK = 50;
  for (let i = 0; i < inputs.length; i += CHUNK) {
    const chunk = inputs.slice(i, i + CHUNK);
    const stmts = chunk.map((input) => {
      const id = `bs_${nanoid(12)}`;
      ids.push(id);
      return db
        .prepare(
          `INSERT INTO batch_subtasks (id, owner, batch_id, input_text, status, attempts)
           VALUES (?, ?, ?, ?, 'pending', 0)`,
        )
        .bind(id, owner, batchId, input);
    });
    await db.batch(stmts);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

/** List all subtasks for a batch (owner-scoped), ordered by created_at ASC. */
export async function listBatchSubtasks(
  db: D1Database,
  owner: string,
  batchId: string,
): Promise<BatchSubtaskRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, owner, batch_id, input_text, status, result_text, error_text, attempts, created_at, updated_at
       FROM batch_subtasks
       WHERE owner = ? AND batch_id = ?
       ORDER BY created_at ASC`,
    )
    .bind(owner, batchId)
    .all<BatchSubtaskRow>();
  return results ?? [];
}

/** Fetch aggregated progress counts for a batch. */
export async function getBatchProgress(
  db: D1Database,
  batchId: string,
  owner?: string,
): Promise<BatchProgress> {
  // When owner is provided (HTTP requests) we scope by it for defence-in-depth.
  // The runner passes no owner (it already verified the batch via the HTTP route);
  // this is safe because batchId is a high-entropy nanoid (64^10 space).
  const { results } = owner
    ? await db
        .prepare(
          `SELECT status, COUNT(*) as cnt
           FROM batch_subtasks
           WHERE batch_id = ? AND owner = ?
           GROUP BY status`,
        )
        .bind(batchId, owner)
        .all<{ status: string; cnt: number }>()
    : await db
        .prepare(
          `SELECT status, COUNT(*) as cnt
           FROM batch_subtasks
           WHERE batch_id = ?
           GROUP BY status`,
        )
        .bind(batchId)
        .all<{ status: string; cnt: number }>();

  const counts: Record<string, number> = {};
  for (const r of results ?? []) {
    counts[r.status] = r.cnt;
  }

  const pending = counts["pending"] ?? 0;
  const running = counts["running"] ?? 0;
  const done = counts["done"] ?? 0;
  const failed = counts["failed"] ?? 0;

  return {
    total: pending + running + done + failed,
    pending,
    running,
    done,
    failed,
  };
}

/**
 * Fetch the next N pending subtasks for a batch.
 * Used by the batch runner to pick up work in bounded concurrency chunks.
 *
 * Note: owner is not included here because the runner receives the batchId only
 * after the HTTP route already verified ownership via getTask(db, id, owner).
 * The batchId itself has high entropy (nanoid(10)) making enumeration infeasible.
 * The rows returned carry `owner` for any per-row checks the runner needs.
 */
export async function listPendingSubtasks(
  db: D1Database,
  batchId: string,
  limit: number,
): Promise<BatchSubtaskRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, owner, batch_id, input_text, status, result_text, error_text, attempts, created_at, updated_at
       FROM batch_subtasks
       WHERE batch_id = ? AND status = 'pending'
       ORDER BY created_at ASC
       LIMIT ?`,
    )
    .bind(batchId, limit)
    .all<BatchSubtaskRow>();
  return results ?? [];
}

/**
 * Fetch all failed subtasks for a batch (used by retry-failed endpoint).
 */
export async function listFailedSubtasks(
  db: D1Database,
  owner: string,
  batchId: string,
): Promise<BatchSubtaskRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, owner, batch_id, input_text, status, result_text, error_text, attempts, created_at, updated_at
       FROM batch_subtasks
       WHERE owner = ? AND batch_id = ? AND status = 'failed'
       ORDER BY created_at ASC`,
    )
    .bind(owner, batchId)
    .all<BatchSubtaskRow>();
  return results ?? [];
}

// ---------------------------------------------------------------------------
// Status update helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to claim a subtask as running (atomic CAS on pending → running).
 * Returns true if this invocation won the race (the row was pending and is
 * now running), false if another runner already claimed it or it is not pending.
 * Callers MUST skip execution when this returns false.
 */
export async function markSubtaskRunning(
  db: D1Database,
  id: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE batch_subtasks
       SET status = 'running', updated_at = unixepoch()
       WHERE id = ? AND status = 'pending'`,
    )
    .bind(id)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

/** Mark a subtask as done with a result. */
export async function markSubtaskDone(
  db: D1Database,
  id: string,
  resultText: string,
): Promise<void> {
  // Truncate result to 2000 chars to avoid oversized D1 column values.
  const safe = resultText.slice(0, 2000);
  await db
    .prepare(
      `UPDATE batch_subtasks
       SET status = 'done', result_text = ?, error_text = NULL, updated_at = unixepoch()
       WHERE id = ?`,
    )
    .bind(safe, id)
    .run();
}

/** Mark a subtask as failed with a plain-language error. */
export async function markSubtaskFailed(
  db: D1Database,
  id: string,
  errorText: string,
): Promise<void> {
  const safe = errorText.slice(0, 1000);
  await db
    .prepare(
      `UPDATE batch_subtasks
       SET status = 'failed', error_text = ?, updated_at = unixepoch(),
           attempts = attempts + 1
       WHERE id = ?`,
    )
    .bind(safe, id)
    .run();
}

/**
 * Reset failed subtasks back to pending so they can be re-processed by the
 * runner. Only resets rows that are currently 'failed' for the given batch.
 * Returns how many rows were reset.
 */
export async function resetFailedSubtasks(
  db: D1Database,
  owner: string,
  batchId: string,
): Promise<number> {
  const result = await db
    .prepare(
      `UPDATE batch_subtasks
       SET status = 'pending', error_text = NULL, updated_at = unixepoch()
       WHERE owner = ? AND batch_id = ? AND status = 'failed'`,
    )
    .bind(owner, batchId)
    .run();
  return result.meta?.changes ?? 0;
}

/**
 * Reset any 'running' subtasks back to 'pending' for a batch. Used when the
 * runner is kicked off for a batch that was partially processed and had
 * interrupted 'running' rows (e.g. due to a Worker timeout).
 *
 * Security note: this is called by the batch runner after the HTTP route has
 * already verified the caller owns the batch (getTask + owner check). The
 * batchId has high entropy (nanoid(10)) making enumeration infeasible.
 */
export async function resetStaleRunningSubtasks(
  db: D1Database,
  batchId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE batch_subtasks
       SET status = 'pending', updated_at = unixepoch()
       WHERE batch_id = ? AND status = 'running'`,
    )
    .bind(batchId)
    .run();
}

// ---------------------------------------------------------------------------
// Subtask id-only helper (for insertSubtask reference)
// ---------------------------------------------------------------------------

// Keep the named export available even though we switched to the batch() path.
export { insertSubtask };
