# tests/failure-explainer.spec.ts

## Purpose

Unit tests for `src/worker/task-runs/failure-explainer.ts`.

Covers:

- Every rule category fires on the correct error message patterns
  (`network`, `timeout`, `source_unavailable`, `metric_not_found`, `auth`,
  `rate_limit`, `config`, `unknown`).
- Context fields (`sourceId`, `metric`, `retryCount`) are interpolated correctly
  into the explanation and fix strings.
- The `formatErrorText` convenience wrapper truncates to ≤ 1000 chars and
  handles non-Error inputs (`null`, `undefined`, plain objects) without throwing.

These are pure unit tests with no I/O, no server dependency, and no LLM calls.
Run with `pnpm test` (Vitest).

## Change history

| Date       | Author       | Notes                              |
|------------|--------------|------------------------------------|
| 2026-06-15 | P2-B batch   | Created alongside failure-explainer.ts for task reliability milestone. |
