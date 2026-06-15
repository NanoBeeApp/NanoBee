# src/components/compare/CompareModelSelect.tsx

## Responsibility
A compare column's model picker: a trigger (provider dot + model label) opening a
searchable list of common models across providers, with a lock flag on providers
that have no key yet and a "配置 API Key" shortcut.

## Props
`{ provider, model, label, canRun(provider), onChange(provider, model), onConfigureKey() }`.

## Relationships
- Upstream: `lib/ai-providers` (`getProviderInfo`), `lib/compare-models`
  (`COMMON_MODELS`, `PROVIDER_DOT`, `modelKey`), `icons/icons`.
- Used by: `CompareColumn`.
- Selection + key dialog are callback-driven (pure presentation).

## Notes
- Closes on outside click + Escape; search filters by label/model/provider.
- Models whose provider can't run are still selectable (the column then shows a
  "needs key" state) but flagged with a lock so the choice is informed.

## Change history
### 2026-06-15 — Created
- Reason: each column needs to pick a provider+model with cross-provider search.
- Goal: zero-network picker (curated `COMMON_MODELS`) + a path to add keys.

### 2026-06-15 — English-only strings
- Reason: public-repo rule — all UI copy must be in English.
- Change: placeholder text and aria labels translated; footer link changed from
  "配置各模型 API Key" to "Configure API keys".
