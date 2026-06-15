-- Migration 0013: task scheduling engine columns.
--
-- Adds trigger_spec, last_run_at, next_run_at, and scheduler_state columns to
-- tasks so the Cloudflare scheduled() cron handler can evaluate rules without
-- touching the display-facing payload JSON.
--
-- trigger_spec: JSON blob (TriggerSpec | null) — declarative rule (schedule or condition).
-- last_run_at:  unix epoch seconds — when the task last fired. NULL = never run.
-- next_run_at:  unix epoch seconds — when the cron should next evaluate this task.
--               NULL = not scheduled / paused. The idx_tasks_scheduled index
--               makes the cron handler poll O(active due tasks) not O(all tasks).
-- scheduler_state: JSON blob — per-task cron state (last metric value, etc.)
--                  kept separate from payload so display code is not coupled to
--                  cron state.
--
-- All new columns are nullable; existing rows are unaffected (NULL = no trigger).

ALTER TABLE tasks ADD COLUMN trigger_spec     TEXT;    -- JSON: TriggerSpec | null
ALTER TABLE tasks ADD COLUMN last_run_at      INTEGER; -- unixepoch, nullable
ALTER TABLE tasks ADD COLUMN next_run_at      INTEGER; -- unixepoch, nullable
ALTER TABLE tasks ADD COLUMN scheduler_state  TEXT;    -- JSON: SchedulerState | null

-- Partial index for the cron handler: only active tasks that have a trigger_spec
-- and a due next_run_at are matched by the scheduled() query.
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled
  ON tasks (status, next_run_at)
  WHERE next_run_at IS NOT NULL;

PRAGMA optimize;
