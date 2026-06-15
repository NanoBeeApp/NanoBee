# src/components/settings/SettingsView.tsx

## Responsibility
State container for the `/settings` page (the AI model & web-search settings
that used to live in the `AiProviderSetupDialog` modal). Fetches auth + saved
settings, owns the form state and the debounced auto-save, and delegates the
master-detail layout to `AiSettingsForm`. Also renders the page heading and the
loading / signed-out states.

## Core exports
- `SettingsView()` — the page component used by the `/settings` route.

## Dependencies
- Upstream: `@tanstack/react-router` (Link), `@/lib/ai-providers`,
  `@/lib/useAuth`, `@/lib/useAiSettings` (settings query + save / fetch-models /
  test-connection mutations), `./AiSettingsForm`, icons.
- Downstream: `routes/_app/settings.tsx`.

## Key notes
- **No forced onboarding.** The backend (`resolveAiConfig`) falls back to
  NanoBee's built-in defaults when no settings row exists, so visiting this page
  is optional. Opening it never writes; edits auto-save (700 ms debounce) only
  after the first change (`dirtyRef`).
- Signed-out users see a prompt + login link instead of the form (the settings
  query is auth-gated, mirroring the old modal which only showed for a user).
- `SettingsFormState` is the inner state component; `AiSettingsForm` is the pure
  render half (state vs. render split per project rules).

## Change history

### 2026-06-13 — created (extracted from AiProviderSetupDialog)
- **Motivation**: the user wanted settings to be a page, not a modal.
- **Goal**: reuse the proven form + auto-save logic on a standalone page.
- **Key decisions**: dropped the modal-only concerns — the visibility latch,
  first-setup auto-open and save-defaults-on-close — because the page is always
  mounted and the backend already defaults; kept the autosave engine verbatim;
  added page heading + loading / signed-out states; the old `onboarding/`
  dialog + form files were deleted.

### 2026-06-15 — wire NotificationSettings into SettingsView
- **Motivation**: expose notification preferences on the /settings page.
- **Changes**: pass `userSignedIn={true}` to `AiSettingsForm` (the
  `SettingsFormState` is only rendered when the user is signed in, so the flag
  is always `true` here); import removed — `NotificationSettings` is now
  consumed inside `AiSettingsForm`, not directly by `SettingsView`.
