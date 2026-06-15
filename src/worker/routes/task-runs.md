# task-runs.ts (route)

Hono route handler for `GET /api/tasks/:id/runs`.

## Purpose

Exposes paginated task run history scoped to the calling user's owner bucket.
The frontend calls this lazily when the TaskDetailDrawer opens (not on the
initial bootstrap load) to keep the startup bundle small.

## Endpoint

```
GET /api/tasks/:id/runs?limit=20&offset=0
```

**Response:**
```jsonc
{
  "runs": [
    {
      "id": "run_abc123",
      "taskId": "t_xyz",
      "startedAt": 1718400000,
      "finishedAt": 1718400001,
      "status": "ok",            // ok | failed | skipped
      "summaryText": "Gold spot checked: 3250.5 — condition not met.",
      "errorText": null
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

## Mount point

Mounted in `routes/api.ts` under `/tasks` so the full path resolves to
`/api/tasks/:id/runs`. IMPORTANT: must be added AFTER the task-runs route is
imported, and mounted BEFORE the generic `taskRoutes` in api.ts so `:id/runs`
doesn't shadow `:id/toggle`.

## Change history & rationale

- **2026-06-15** — Created for task-reliability milestone. Kept response slim
  (no detail_json) since the UI only needs status + text for the timeline.
