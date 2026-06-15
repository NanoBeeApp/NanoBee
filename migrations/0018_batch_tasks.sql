-- Migration 0018: batch task engine.
--
-- Introduces a dedicated `batch_subtasks` table for per-row execution state.
-- Parent batch tasks live in the existing `tasks` table, identified by
-- kind='batch' in the payload JSON.  A `batch_id` column on subtasks links
-- each row back to its parent without altering the tasks table schema.
--
-- batch_subtasks columns:
--   id          — primary key ("bs_<nanoid>")
--   owner       — mirrors tasks.owner for isolated queries
--   batch_id    — FK to tasks.id (the parent batch task)
--   input_text  — per-row input value (company name, URL, keyword…)
--   status      — lifecycle: pending → running → done | failed
--   result_text — short plain-text result when status='done'
--   error_text  — plain-language failure reason when status='failed'
--   attempts    — how many times this subtask has been attempted (for retry)
--   created_at  — row creation time (unixepoch)
--   updated_at  — last status change (unixepoch)
--
-- The (owner, batch_id) compound index powers the GET /api/tasks/batch/:id
-- subtask listing query; the (batch_id, status) index powers the runner's
-- pending-row query without a full table scan.

CREATE TABLE IF NOT EXISTS batch_subtasks (
  id          TEXT    NOT NULL PRIMARY KEY,
  owner       TEXT    NOT NULL DEFAULT 'anon',
  batch_id    TEXT    NOT NULL,
  input_text  TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'pending',  -- pending | running | done | failed
  result_text TEXT,
  error_text  TEXT,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Primary access pattern: list subtasks for a batch (owner-scoped for safety).
CREATE INDEX IF NOT EXISTS idx_batch_subtasks_owner_batch
  ON batch_subtasks (owner, batch_id, created_at ASC);

-- Runner access pattern: find pending subtasks for a batch.
CREATE INDEX IF NOT EXISTS idx_batch_subtasks_batch_status
  ON batch_subtasks (batch_id, status);

PRAGMA optimize;
