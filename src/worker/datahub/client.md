# src/worker/datahub/client.ts

## Responsibility
Thin client for the NanoBee data hub (the single gateway for all external
public data). NanoBee never calls third-party data APIs directly — it
discovers sources from the hub catalog and invokes them by id.

## Core exports / API
- `isDataHubEnabled(env)` — whether `DATA_HUB_URL` is configured
- `listDataSources(env): Promise<DataSourceDescriptor[]>` — catalog; `[]`
  when disabled/unreachable
- `invokeDataSource(env, id, params): Promise<DataSourceResult | null>` —
  invoke by id; `null` on failure
- Types mirroring the hub contract: `DataSourceParam`,
  `DataSourceDescriptor`, `DataSourceResult`

## Dependencies
- Upstream: `agent/datahub-tools.ts`
- Downstream: `DATA_HUB_URL` binding, `config.ts` (`DATA_HUB`), the hub's
  `/api/sources*` endpoints

## Notes
- Every failure path degrades to an empty value so chat never breaks on hub
  problems; timeouts come from `CONFIG.DATA_HUB.REQUEST_TIMEOUT_MS`.
- One-shot fetch retry smooths transient loopback resets between local
  workerd dev servers (harmless in production).

## Change history

### 2026-06-12 — created
- **Motivation**: answering "what's on HN today" needs hub data, and the set
  of sources is open-ended — discovery must be data-driven.
- **Key decision**: catalog discovery + invoke-by-id so NanoBee needs no
  per-source code; all failures degrade gracefully.

### 2026-06-12 — rewritten doc in English; consumer switched to agent loop
- **Motivation**: this is a public repository (English-only docs), and the
  one-shot `datahub/augment` consumer was replaced by `agent/datahub-tools`.
