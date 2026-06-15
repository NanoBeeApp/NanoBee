# Migration 0018 — batch_subtasks table

## Purpose

Adds a dedicated `batch_subtasks` table to support the batch task engine.
Parent batch tasks reuse the existing `tasks` table (kind='batch' in payload JSON)
while per-row execution state lives in this new table.

## Schema decisions

- **One row per subtask**: each CSV/TSV row that needs processing becomes one
  `batch_subtasks` row, keeping the tasks table clean.
- **owner duplication**: copying `owner` onto subtasks allows isolated queries
  without a JOIN to the parent tasks row on every status check.
- **status enum**: `pending → running → done | failed`; `attempts` enables
  retry-failed flows without losing history.
- **unixepoch() default**: consistent with every other table in this project;
  avoids any JS-side Date construction in Cloudflare Workers global scope.

## Indexes

- `idx_batch_subtasks_owner_batch` — powers `GET /api/tasks/batch/:id` (list subtasks).
- `idx_batch_subtasks_batch_status` — powers the runner's pending-row query.

## Change history

- 2026-06-15: Initial creation for P3 batch task engine.
