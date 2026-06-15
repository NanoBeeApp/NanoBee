# src/worker/routes/compare.ts

## Responsibility
Backend for the multi-model compare page: provider catalog + per-user key CRUD,
and a per-column SSE streaming endpoint. Keys never leave the worker.

## Endpoints
- `GET /api/compare/providers` → `{ signedIn, providers[], configured[] }`.
- `PUT /api/compare/keys` (auth) → save one provider's key/host → `{ configured }`.
- `DELETE /api/compare/keys/:provider` (auth) → remove key → `{ configured }`.
- `POST /api/compare/stream` → SSE for ONE (provider, model, messages):
  `token` (JSON-encoded text delta) → `done` (`{durationMs}`) | `error`
  (`{code: "no_key"|"request_failed", message}`).

## Relationships
- Upstream: `ai/provider-keys` (resolve + CRUD), `ai/client` (`streamAgentText`),
  `ai-providers` (catalog/validation), `auth/*` (session), `config`.
- Mounted in `routes/api.ts` as `.route("/compare", compareRoutes)`.
- Frontend consumers: `useCompareStore` (stream via `fetch`), `ProviderKeyDialog`
  + `CompareModelSelect` (providers/keys via `fetch`).

## Notes
- One stream request per column (frontend fires N concurrently) so columns are
  independent — a failure or missing key degrades a single column only.
- Not exposed over the typed RPC client: SSE responses are read as a raw
  `ReadableStream`, so the frontend calls these paths with `fetch` directly.
- `streamAgentText` is tool-free (compare answers don't need tools) and supports
  both the OpenAI and Anthropic wire protocols.

## Change history
### 2026-06-15 — Created
- Reason: compare MVP (cross-provider) needs concurrent per-model streaming and a
  place to manage multiple provider keys.
- Goal: independent per-column SSE + key vault endpoints, keys staying server-side.
- Key decision: per-column endpoint (not one endpoint fanning out N models) so
  the slowest/failing model never holds up the rest.
