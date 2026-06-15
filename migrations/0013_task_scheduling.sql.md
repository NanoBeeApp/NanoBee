# migrations/0013_task_scheduling.sql

## Purpose

Adds the scheduling-engine columns to the `tasks` table so the Cloudflare
`scheduled()` cron handler can evaluate declarative trigger rules without touching
the display-facing `payload` JSON column.

### New columns on `tasks`

| Column | Type | Meaning |
|---|---|---|
| `trigger_spec` | `TEXT` (JSON) | Serialized `TriggerSpec` — `null` = not a scheduled task |
| `last_run_at` | `INTEGER` | Unix epoch seconds when the task last fired; `null` = never |
| `next_run_at` | `INTEGER` | Unix epoch seconds of the next planned cron evaluation; `null` = not scheduled or paused |
| `scheduler_state` | `TEXT` (JSON) | Per-task cron state blob (e.g. last observed metric value for the `changed` operator) — kept separate from `payload` so display code is not coupled to cron internals |

### New index

`idx_tasks_scheduled` — a partial index on `(status, next_run_at)` where
`next_run_at IS NOT NULL`. The cron handler queries:

```sql
WHERE status = 'active' AND trigger_spec IS NOT NULL
  AND (next_run_at IS NULL OR next_run_at <= :now)
```

This index makes the poll O(active due tasks) rather than O(all tasks).

## Change history & rationale

### 2026-06-15 — Initial creation

Adds `trigger_spec`, `last_run_at`, `next_run_at`, and `scheduler_state`
columns to `tasks` as nullable ALTERs — non-destructive; existing rows keep
`NULL` in all four columns which the cron handler interprets as "not a
scheduled task, skip".

Migration 0012 already added `owner` to `tasks`/`updates`. This migration is
strictly scheduling-engine concerns only, keeping each migration's scope
narrow and reviewable.
