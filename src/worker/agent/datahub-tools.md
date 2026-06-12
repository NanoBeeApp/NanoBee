# src/worker/agent/datahub-tools.ts

## Responsibility
Data-hub tool provider: maps every source in the hub catalog to an agent
tool named `datahub_<sourceId>` with a JSON Schema derived from the source's
declared params.

## Core exports / API
- `datahubTools(env): Promise<AgentTool[]>` — `[]` when DATA_HUB_URL is unset
  or the hub is unreachable

## Dependencies
- Upstream: `agent/tools.ts` (collector)
- Downstream: `datahub/client` (listDataSources / invokeDataSource)

## Notes
- `execute` returns the source's `summary` digest — already prompt-ready, so
  the loop needs no per-source formatting.
- Non-primitive argument values are dropped before invocation (sources accept
  string/number/boolean only).

## Change history

### 2026-06-12 — created
- **Motivation**: the agent loop replaces the one-shot router; hub sources
  must surface as first-class tools the model can call directly.
- **Key decision**: discovery stays catalog-driven — a new hub source becomes
  a callable tool on the next request with no code change.
