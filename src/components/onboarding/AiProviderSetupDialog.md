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
