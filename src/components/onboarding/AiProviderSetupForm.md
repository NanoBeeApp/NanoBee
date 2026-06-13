# src/components/onboarding/AiProviderSetupForm.tsx

## Responsibility
Pure render component for the AI provider setup dialog: provider pill
radio-group, API key / host / model fields, inline error, and the commit
actions ("先用默认配置" + save on first setup; cancel + save in edit mode)
pinned to the bottom of the master column. No header/footer chrome bar — the
form spans the full modal height; close is a floating top-right affordance.
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

### 2026-06-13 — web-search key field
- **Motivation**: render the Tavily key input in the detail pane.
- **Goal**: password input + visibility toggle below the model field
  (testids `ai-web-search-key-input` / `ai-web-search-key-toggle`), hint
  explains it is provider-independent and optional (built-in default key).

### 2026-06-13 — 去掉 header/footer，最大化主体内容区域
- **出发点**：原弹窗顶部整条 header（标题+副标题）和底部整条 footer（取消/保存）吃掉约 140px 纵向空间，把右侧表单挤到很小，连接测试一行被裁切。
- **目标**：遵守「主体内容可视区域最大化铁律」，去掉两条 chrome 横条，让表单铺满弹窗高度。
- **关键决策**：① 删除 `.nb-ai-head` 头部条，关闭按钮改为浮动在弹窗右上角（`.nb-ai-close` 绝对定位）；② 删除底部 `.nb-modal-foot`，保存/取消（或「先用默认配置」）移到左侧 master 栏底部 `.nb-ai-actions`（`margin-top:auto` 贴底，按钮全宽竖排）；③ provider 列表抽到 `.nb-ai-master-list`（`flex:1` 独立滚动），actions 不随列表滚动；④ 弹窗高度由 `max-height` 改为 `height: min(620px, 100vh-32px)` 让表单充分占高。移动端：actions 横排、列表 wrap。

### 2026-06-13 — 真实彩色 logo + 去掉保存/取消（改即时自动保存）
- **出发点**：用户要求 ① provider 列表用各家真实彩色 logo 替换灰色首字母徽标；② 去掉 master 栏底部的「保存 / 取消」按钮。
- **目标**：provider 行展示官方品牌 logo（彩色），并把显式提交动作替换为一条「修改后自动保存」状态行。
- **关键决策**：① 首字母徽标 `.nb-ai-prow-badge` 改为 `ProviderLogo`（`icons/provider-logos.tsx`，品牌色 tile + 官方单路径 mark，Gemini/Mistral 保留渐变，无单路径的几家用品牌色字母兜底）；② 删除 `.nb-ai-actions` 整块（保存/先用默认配置/取消），底部改放 `.nb-ai-savehint` 自动保存状态（idle/saving/saved/error/invalid 五态，对应文案与圆点色由 `data-state` 驱动）；③ 关闭按钮恒显（不再只在非首次时显示），因为自动保存让弹窗随时可安全关闭；④ 移除 `isFirstSetup`/`saving`/`onSubmit`/`onSkip` props，新增 `saveState`/`saveText`。

### 2026-06-13 — 多供应商 Web 搜索设置
- **出发点**：原 Web 搜索字段只有 Tavily 一个 Key 输入框，用户要求支持多家搜索供应商。
- **目标**：把单一 Tavily 字段改为「Web 搜索（联网，可选）」分区——供应商下拉（Tavily / Brave / Serper / Exa）+ 对应 Key 输入框，hint 与 placeholder 随所选供应商变化。
- **关键决策**：`AiSetupFormValues` 增加 `webSearchProvider`；`onFieldChange` 字段联合类型加入 `webSearchProvider`；保持纯渲染，供应商目录来自 `lib/ai-providers` 的 `WEB_SEARCH_PROVIDERS`。
