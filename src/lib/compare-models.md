# src/lib/compare-models.ts

## Responsibility
Shared, platform-free catalog for the multi-model compare page: provider brand
dot colors, a curated list of common models per provider, the default 2-column
set, column-count bounds, and helpers to encode/decode/label a `provider:model`.

## Core exports
- `MIN_COMPARE_COLUMNS = 2`, `MAX_COMPARE_COLUMNS = 6`.
- `PROVIDER_DOT: Record<AiProviderId, string>` — dot color per provider.
- `CompareModelOption { provider, model, label }`.
- `COMMON_MODELS: CompareModelOption[]` — curated picker list (OpenRouter first).
- `DEFAULT_COMPARE_MODELS` — two OpenRouter models (zero-config default).
- `modelKey(provider, model)`, `parseModelKey(token, isProvider)`, `modelLabel(...)`.

## Relationships
- Upstream: `./ai-providers` (`AiProviderId`).
- Downstream (frontend): `useCompareStore`, `useCompareUrlSync`, `CompareModelSelect`.
- Downstream (worker): not imported directly; the worker validates provider ids
  via `ai-providers` and trusts the model string.

## Notes
- Curated ids let the picker work offline; advanced users can type any model id.
- OpenRouter model ids carry the upstream vendor prefix (`anthropic/claude-...`).

## Change history
### 2026-06-15 — Created
- Reason: the compare page needs one agreed catalog for the picker, the default
  set, and URL encoding of the selected models.
- Goal: zero-network model picking + bookmarkable `provider:model` URL tokens.
- Key decision: OpenRouter entries first since they need no user key.
