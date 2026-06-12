# api-client.ts

## Responsibility
Typed Hono RPC client for the browser. Shares `AppType` with the worker so
every `/api` call is type-checked end to end.

## Core exports / API
- `apiClient` — `hc<AppType>(origin + "/api")`; e.g. `apiClient.users.$get()`

## Dependencies
- Upstream: `hono/client`, `../worker/api-worker` (type only)
- Downstream: any frontend data-fetching code

## Notes
Base URL includes `/api` because `AppType` is the sub-app type (routes are
defined without the prefix). Browser-only; SSR code should not use it.

## Change history

### 2026-06-12 — created
- **Motivation**: template init.
- **Key decision**: appended `/api` to the base URL so client paths match the
  sub-app route types exactly (the template's comment example was stale).

### 2026-06-12 — docs fix
- **Motivation**: code review caught the usage example still showing
  `apiClient.api.users.$get()` (an extra `.api` level that does not exist);
  updated to a real call.
