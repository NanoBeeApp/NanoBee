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
