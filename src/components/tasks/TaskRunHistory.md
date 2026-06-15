# TaskRunHistory.tsx

Lazy-loaded run history timeline shown inside TaskDetailDrawer.

## Purpose

Fetches `GET /api/tasks/:id/runs` when the drawer opens (not during bootstrap),
shows a paginated timeline of recent runs with status dot, relative time, and
the summary or plain-language failure explanation from `task_runs.error_text`.

## Behaviour

- First fetch fires on mount (when drawer opens). Results are not cached in the
  store — the drawer is expected to be opened infrequently and the data is
  time-sensitive.
- Status dot CSS reuses the existing `.nb-tk-trun` convention: `tone-active`
  (ok), `tone-failed` (failed), `tone-paused` (skipped).
- For `failed` runs, `errorText` (plain-language from failure-explainer) is
  shown instead of the raw summary.
- "加载更多" appends the next page (10 rows); tracks `offset` locally.
- Absolute timestamp shown on hover (`title` attribute).

## Props

| Prop | Type | Description |
|------|------|-------------|
| `taskId` | `string` | Task primary key (not owner — the backend enforces ownership). |

## Change history & rationale

- **2026-06-15** — Created as part of task-reliability milestone. Kept component
  small and self-contained; no global state (Zustand) needed for read-only history.
