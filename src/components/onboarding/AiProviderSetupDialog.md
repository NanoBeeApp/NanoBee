# src/components/onboarding/AiProviderSetupDialog.tsx

## Responsibility
State container for the AI provider setup dialog. Decides visibility (auto
on first login when the signed-in user has no saved settings; manually via
the account menu through the `aiSetupOpen` store flag), owns form state and
client-side validation, runs the save mutation, and delegates rendering to
the pure `AiProviderSetupForm`.

## Core exports / API
- `AiProviderSetupDialog` — mounted once in `App.tsx`
- (internal) `AiSetupFormState` — per-open form-state holder, remounted via
  `key` so each opening starts from the saved settings

## Dependencies
- Upstream: `lib/useAuth.ts`, `lib/useAiSettings.ts`, `lib/ai-providers.ts`,
  `store/useAppStore.ts` (aiSetupOpen, toast)
- Downstream: `App.tsx`

## Notes
- First-setup mode: no cancel/close (scrim click is a no-op); the escape
  hatch is "先用默认配置" which persists the backend default (OpenRouter +
  built-in key) so the dialog never nags again.
- `toSaveInput` normalizes fields equal to the provider defaults back to
  `""` so future catalog default changes reach these users.
- Blank key input keeps a stored key (same provider) — placeholder text
  explains this; switching providers re-seeds host/model defaults.

## Change history

### 2026-06-12 — created
- **Motivation**: newly logged-in users should choose an AI provider and
  enter API key / host / model, with the backend defaulting to DeepSeek V4
  Flash via OpenRouter for those who skip.
- **Key decision**: state/render split per project convention; visibility is
  derived (`!configured` || store flag) rather than stored, so it stays
  correct across login/logout without effects.

### 2026-06-12 — own model fetching state
- **Motivation**: the form gained a model dropdown that needs a fetched list,
  loading/error state, and a one-shot auto-fetch on open.
- **Goal**: hold `models`/`modelsError` here and call `useFetchModels`; auto-
  fetch once when a usable key exists, clear the list on provider change.
- **Key decision**: auto-fetch is a one-shot ref-guarded effect (not keyed to
  every keystroke) so typing a key doesn't spam the provider; refresh is manual.

### 2026-06-12 — 连接测试状态 + 双栏接线
- **出发点**：双栏表单新增连接测试，需要状态容器持有测试态。
- **目标**：持有 testStatus/testResult，调用 useTestConnection；provider 切换与 key/host/model 编辑都重置测试态（避免陈旧结果）。
- **关键决策**：测试失败以结果对象呈现（不 throw）；编辑字段即让上一次测试结果失效，保证状态与输入一致。

### 2026-06-13 — web-search (Tavily) key wiring
- **Motivation**: users supply their own web-search key; blank means "use the
  built-in default".
- **Goal**: form value `webSearchKey`; `toSaveInput` applies keep/clear/replace
  against `hasStoredWebSearchKey`, which is provider-independent (switching
  providers keeps the stored web-search key).

### 2026-06-13 — 即时自动保存（去掉保存/取消按钮）
- **出发点**：用户要求去掉「保存 / 取消」按钮，改为编辑即时自动保存。
- **目标**：字段或 provider 变更后防抖落库，无需任何显式提交动作；状态以 `.nb-ai-savehint` 行内提示反馈。
- **关键决策**：① 新增防抖自动保存 effect（`AUTOSAVE_DELAY` 700ms）：跳过首次挂载（仅打开不写库），`validate()` 通过且 payload 变化才 `onPersist`，用 `lastSavedRef` 序列化对比去重避免回环；校验失败置 `invalid` 态、行内提示原因而非红色 error 块。② 可见性改为闩在 store flag `aiSetupOpen` 上（不再含 `configured`/key），使自动保存翻转 `configured` 时弹窗不被卸载/重挂、不丢输入；首次登录由 `autoOpenedRef` 一次性自动打开、关闭后不再回弹。③ `onSave`（保存即关闭+toast）拆为 `onPersist`（只落库不关闭）；关闭时若首次且尚无保存，则补存当前合法值或 OpenRouter 默认（替代旧「先用默认配置」）。④ provider 切换标记 dirty 触发自动保存。

### 2026-06-13 — Web 搜索供应商选择 + 即时保存接线
- **出发点**：支持多家 Web 搜索供应商（Tavily / Brave / Serper / Exa）。
- **关键决策**：`initialValues` 读取 `settings.webSearchProvider`（默认 tavily）；`toSaveInput` 带上 `webSearchProvider`；`hasStoredWebSearchKey` 改为「仅当存储的供应商与当前所选一致」才算有 key（与 AI provider key 一致语义）；切换 Web 搜索供应商时清空已输入的 key（属于旧供应商），交由自动保存防抖落库。

### 2026-06-13 — 移除空闲态「修改后自动保存」文案
- **出发点**：用户要求去掉空闲态提示「修改后自动保存」。
- **改动**：`saveStateText` 的 idle 默认分支返回空串；表单仅在 `saveText` 非空时渲染 `.nb-ai-savehint`（连圆点一起隐藏），保存中/已保存/失败/校验态仍正常显示。
