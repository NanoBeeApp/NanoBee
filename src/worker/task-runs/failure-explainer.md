# failure-explainer.ts

Rules-based mapper from raw error messages to plain-language failure explanations
stored in `task_runs.error_text`.

## Purpose

NanoBee's differentiator over raw stack traces: instead of surfacing `FetchError:
ENOTFOUND data-hub.internal` to the user, we detect the error category and emit
a short friendly sentence + an actionable fix, e.g.:

> "Could not reach the 'gold' data source — the network appears to be unreachable.
> Check your internet connection or the data-hub service status."

## Design

- **Rules-based, no LLM.** LLM calls in an error path risk compounding failures
  (model unavailable, rate limits, latency). Deterministic rules are fast and
  always available.
- **First-match wins.** `RULES` is evaluated top-to-bottom. More specific patterns
  appear before generic fallbacks.
- **`FailureContext`** carries optional metadata (sourceId, metric path, retry count,
  task kind) to produce more specific messages.
- **`formatErrorText()`** is the convenience entry point that formats
  `explanation + fix` into one string ≤ 1000 chars (the column limit).

## Categories

| Category | Meaning |
|----------|---------|
| `network` | DNS failure, connection refused, fetch error |
| `timeout` | Request took too long |
| `source_unavailable` | Data-hub not reachable or source id unknown |
| `metric_not_found` | The dot-path metric was absent from the data |
| `config` | Invalid trigger spec / JSON parse error |
| `auth` | Missing or invalid API key |
| `rate_limit` | 429 / quota exceeded |
| `unknown` | No rule matched |

## Change history & rationale

- **2026-06-15** — Created as part of task-reliability milestone (migration 0019 /
  task_runs table). Kept intentionally rules-based; LLM-assisted explanations are
  a future option once the DB layer is stable.
