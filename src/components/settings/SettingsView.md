# src/components/settings/SettingsView.tsx

## Responsibility
State container for the `/settings` page (the AI model & web-search settings
that used to live in the `AiProviderSetupDialog` modal). Fetches auth + saved
settings, owns the form state and the debounced auto-save, and delegates the
master-detail layout to `AiSettingsForm`. Renders the loading / signed-out
states; the page heading was removed (the "设置" header now lives at the top of
the sidebar's settings category list — see `sidebar/SettingsNavList`).

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

### 2026-06-18 — remove the page header
- **Motivation**: the user asked to drop the settings page header and relocate the
  "设置" label to the top of the sidebar's settings category list.
- **Changes**: deleted the `<header className="nb-settings-head">` block (title +
  subtitle); the page now renders the `AiSettingsForm` (or the loading /
  signed-out state) directly, filling the whole content area. The
  `settings.pageTitle` / `settings.pageSubtitle` i18n keys are no longer used here
  (left in place, harmless). The corresponding `.nb-settings-head` CSS was removed.

### 2026-06-13 — created (extracted from AiProviderSetupDialog)
- **Motivation**: the user wanted settings to be a page, not a modal.
- **Goal**: reuse the proven form + auto-save logic on a standalone page.
- **Key decisions**: dropped the modal-only concerns — the visibility latch,
  first-setup auto-open and save-defaults-on-close — because the page is always
  mounted and the backend already defaults; kept the autosave engine verbatim;
  added page heading + loading / signed-out states; the old `onboarding/`
  dialog + form files were deleted.

### 2026-06-15 — i18n Phase 1: page heading / subtitle / states via useT()
- **Motivation**: i18n foundation requires all wired surfaces to use the t() function.
- **Changes**: imports `useT` from `@/lib/i18n/LocaleContext`; page title, subtitle,
  loading text, signed-out prompt, and login button label are now `t('settings.*')`
  calls. Locale changes (zh ↔ en) reflect live without a reload.

### 2026-06-15 — wire NotificationSettings into SettingsView
- **Motivation**: expose notification preferences on the /settings page.
- **Changes**: pass `userSignedIn={true}` to `AiSettingsForm` (the
  `SettingsFormState` is only rendered when the user is signed in, so the flag
  is always `true` here); import removed — `NotificationSettings` is now
  consumed inside `AiSettingsForm`, not directly by `SettingsView`.
