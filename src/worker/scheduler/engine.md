# src/worker/scheduler/engine.ts

## Purpose

Pure rules-based cron evaluator for the NanoBee task scheduling engine.
Called from the `scheduled()` handler in `src/server.ts` via
`ctx.waitUntil(runScheduler(env))`.

No LLM calls, no user API keys. All logic is deterministic rules evaluated
on the server in the Cloudflare `scheduled()` handler (fires every 15 minutes
per the `*/15 * * * *` cron trigger in `wrangler.json`).

## Core exports / API

- `runScheduler(env)` — main entry point; iterates all active due tasks and
  evaluates each trigger. One task failure never aborts the full tick.
- `computeNextRunAt(spec, after)` — exported so `tasks.ts` can compute
  `next_run_at` on task creation and re-arm on toggle resume. **Must only be
  called inside handler/function scope** (uses `new Date()` internally).
- `extractMetric(result, path)` — dot-path + bracket notation extractor for
  `DataSourceResult`.
- `evaluateCondition(value, op, threshold, previousValue)` — pure comparator.
- `renderTemplate(template, vars)` — `{{variable}}` substitution.
- `shouldSendPushNow(settings, nowUnix, importance)` — exported pure rules
  function; returns true when push should be sent immediately based on the
  user's notification settings (push toggle, DND window, digest threshold).
- `isInDnd(nowMinutesUtc, dndStart, dndEnd)` — pure helper; true when the
  given UTC minute-of-day falls inside the DND window (handles midnight wrap).

## Task trigger kinds

### `schedule` (ScheduleTrigger)

1. SQL query (`listActiveDueTasks`) returns all active tasks where `trigger_spec IS NOT NULL AND (next_run_at IS NULL OR next_run_at <= now)`.
2. Engine verifies `spec.kind === 'schedule'`.
3. Writes a new `updates` row for the task's owner via `createUpdate()`.
4. Calls `updateTaskSchedulerState()` with `lastRunAt = now`, `nextRunAt = computeNextRunAt(spec, now)`.
5. Fires Web Push if VAPID keys are configured (Phase 1b, non-blocking).

### `condition` (ConditionTrigger)

1. Checks cooldown: if `last_run_at` is set and `now - last_run_at < cooldownSeconds`, skips (updates `next_run_at = last_run_at + cooldown`).
2. Calls `invokeDataSource(env, spec.sourceId, spec.params ?? {})`.
3. Extracts metric via `extractMetric(result, spec.metric)`.
4. Evaluates condition via `evaluateCondition(value, spec.op, spec.threshold, previousValue)`.
5. `previousValue` is read from `scheduler_state` JSON (`lastValue` field).
6. On trigger: renders `spec.messageTemplate`, writes `updates` row, fires Web Push.
7. Always persists updated `scheduler_state` (`lastValue`, `lastTriggeredAt`) so the `changed` operator and cooldown work correctly across ticks.

## Timing / jitter

The `*/15 * * * *` cron means schedule tasks fire within a 15-minute window
of their target time. This is acceptable for a monitoring product. For
sub-minute precision, a Durable Object alarm approach would be needed.

## Web Push (Phase 1b) + Notification settings gating

`attemptPushForOwner()` is called after writing each feed row but only runs
when `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY_ENC`, and `AUTH_SECRET` are all
set in the worker env. Errors are caught and logged; they never propagate to
the cron tick. `vapid.ts` is lazy-imported to avoid loading it in envs where
push is not configured.

Before dispatching push, `attemptPushForOwner` loads the user's notification
settings row (`user_notification_settings`) and calls `shouldSendPushNow()`.
If the user has disabled push, is in a DND window, or digest mode is on and
the importance is below their threshold, the push is silently skipped.

### Notification gating rules (evaluated in order)

1. `push_enabled = 0` → skip.
2. Current UTC time is inside `[dnd_start, dnd_end)` → skip (midnight-wrapping supported).
3. `digest_enabled = 1` AND message importance < `importance_threshold` → skip (digest queue — future work).
4. Otherwise → send.

## Design decisions

- `nanoid()` calls are inside function bodies (never module-level).
- `Date.now()` / `new Date()` are inside function bodies (Workers deploy validation).
- A single `computeNextRunAt` re-export keeps tasks.ts from duplicating the logic.
- Condition task `scheduler_state` is a separate JSON blob from `payload` so display code is never coupled to cron internals.

## Dependencies

- `src/worker/db/repo` — `listActiveDueTasks`, `createUpdate`, `updateTaskSchedulerState`
- `src/worker/datahub/client` — `invokeDataSource`, `isDataHubEnabled`
- `src/worker/push/vapid` — lazy-imported for Web Push delivery
- `src/worker/routes/notification-settings` — `UserNotificationSettings` type
- `src/types` — `TriggerSpec`, `ScheduleTrigger`, `ConditionTrigger`, `ConditionOp`

## Change history & rationale

### 2026-06-15 — Task reliability: run recording + retry/backoff

Added `task_runs` table recording to every execution path:
- **schedule tasks**: always write `status='ok'` after the feed row is created.
- **condition tasks**: write `ok` (condition not met = successful check), `ok`
  (triggered), `failed` (data-hub unreachable after retries / metric not found),
  or `skipped` (in cooldown / data-hub not configured).
- **config errors**: write `failed` when `trigger_spec` JSON cannot be parsed.

Added bounded exponential backoff retry for `invokeDataSource()` calls:
`MAX_RETRIES = 2`, base delay 1 s. Worst-case latency within the cron tick is
< 8 s (1 s + 2 s delays). Uses a local `sleep()` helper (Promise + setTimeout).

Added `formatErrorText()` (from `task-runs/failure-explainer.ts`) to convert
raw errors to human-readable `error_text` stored in `task_runs`.

### 2026-06-15 — Initial creation

Implements the MVP task scheduling engine: schedule-kind (daily UTC fire)
and condition-kind (data-hub metric threshold) task evaluation. The engine
is a pure standalone module — it has no imports from the HTTP layer and can
be tested in isolation. Web Push delivery is wired in but gated behind env
var presence (Phase 1b).

### 2026-06-15 — Notification settings gating

Added `loadNotificationSettings`, `shouldSendPushNow`, `isInDnd`, and
`meetsThreshold` helpers. `attemptPushForOwner` now loads the user's
`user_notification_settings` row before dispatching and skips push when the
user's toggle, DND window, or digest-mode threshold blocks it. The two
exported pure functions (`shouldSendPushNow`, `isInDnd`) are unit-testable
without a D1 binding.

### 2026-06-15 — Fix: narrow mergedParams type to match invokeDataSource signature

`mergedParams` was typed as `Record<string, unknown>` but `invokeDataSource`
expects `Record<string, string | number | boolean>`. Changed the type to match —
`spec.params` is already `Record<string, string | number | boolean>` per
`src/types.ts` and `env.TAVILY_API_KEY` is a `string`, so the narrower type is
exact and correct.

### 2026-06-15 — Websearch credential injection in evaluateConditionTask

`evaluateConditionTask` now builds a `mergedParams` object before calling
`invokeDataSource`. When `spec.sourceId === 'websearch'` and `env.TAVILY_API_KEY`
is set, it injects `tavily_api_key` into the merged params. This mirrors how
the chat pipeline (messages.ts) injects secrets via `agentCtx.secrets`, ensuring
condition tasks that use the websearch source (e.g. `tpl_keyword_watch`) can
actually reach the data-hub provider instead of receiving a "no credential"
error and silently skipping every tick.
