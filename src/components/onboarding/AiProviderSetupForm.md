# src/components/onboarding/AiProviderSetupForm.tsx

## Responsibility
Pure render component for the AI provider setup dialog: provider pill
radio-group, API key / host / model fields, inline error, and the footer
actions ("先用默认配置" + save on first setup; cancel + save in edit mode).
Completely stateless — all values and callbacks come from
`AiProviderSetupDialog`.

## Core exports / API
- `AiProviderSetupForm(props: AiProviderSetupFormProps)`
- `AiSetupFormValues` — `{ provider, apiKey, baseUrl, model }`

## Dependencies
- Upstream: `lib/ai-providers.ts` (catalog for the pill list)
- Downstream: `components/onboarding/AiProviderSetupDialog.tsx`

## Notes
- Reuses the global `.field` / `.field-label` / `.input` / `.field-error` and
  `.btn` primitives; dialog-specific styles live under `.nb-modal*` /
  `.nb-ai-*` in `src/styles/app.css`.
- Key placeholder adapts to context: "已保存，留空保持不变" (stored key),
  "可留空，使用 NanoBee 内置额度" (OpenRouter), `sk-...` otherwise.
- Test anchors: `ai-provider-setup-dialog`, `ai-provider-option-{id}`,
  `ai-api-key-input`, `ai-host-input`, `ai-model-input`,
  `ai-settings-save` / `ai-settings-skip` / `ai-settings-cancel`,
  `ai-settings-error`, `ai-provider-hint`.

## Change history

### 2026-06-12 — created
- **Motivation**: the setup dialog needs a presentational layer separate from
  state handling, per the project's state/render component split.
- **Key decision**: provider choice as a pill radio-group (not a `<select>`)
  so all five options and the "默认" tag are visible at a glance during
  onboarding.

### 2026-06-12 — model dropdown + auto-fetch
- **Motivation**: typing model ids by hand is error-prone; users want to pick
  from the provider's actual model list.
- **Goal**: an "自动获取模型" button plus a `<select>` of fetched ids, with the
  free-text input kept as a manual fallback for ids not in the list.
- **Key decision**: stay presentational — models/loading/error and the fetch
  trigger arrive as props; the text input remains the source of truth so manual
  and dropdown-selected values share one field.
