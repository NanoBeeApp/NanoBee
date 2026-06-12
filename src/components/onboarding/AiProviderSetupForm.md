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

### 2026-06-12 — master-detail 双栏重写 + 连接测试
- **出发点**：用户要求弹窗左栏列所有 provider、右栏单个 provider 设置并可测试连接（按 V2 设计稿实现）。
- **目标**：左 master（provider 列表，首字母徽标 + 默认胶囊 + 选中整块高亮，无侧条）/ 右 detail（API Key 带显示切换、Host、模型下拉+手动+自动获取、连接测试 inline 三态、保存）。
- **关键决策**：保持纯渲染，仅保留 password 显隐这一 UI 态本地 useState；连接测试三态（idle/testing/success/error）由 props 注入，TestStatusLine 子组件渲染圆点+文案；无嵌套卡片、字号≥12px、对比度达标。
