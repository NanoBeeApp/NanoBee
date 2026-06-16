# src/components/settings/AiSettingsForm.tsx

## Responsibility
Pure render component for the AI settings page. Master-detail layout: a provider
list on the left (model providers + a standalone "Web 搜索" (Web Search) entry), the selected
provider's settings on the right (API key with show/hide, API host, model picker
with auto-fetch, connection test). Stateless except for UI-only
password-visibility and active-pane toggles; all data + callbacks come from
`SettingsView`.

## Core exports
- `AiSettingsForm(props)` — the master-detail form, rendered inline on the page
  (wrapped in `.nb-ai-split.nb-settings-split`, no modal scrim/close).
- Types: `AiSetupFormValues`, `TestStatus`, `SaveState`, `AiSettingsFormProps`.

## Dependencies
- Upstream: `@/icons/icons`, `@/icons/provider-logos`, `@/lib/ai-providers`,
  `@/lib/useAiSettings` (TestConnectionResult type).
- Downstream: `SettingsView`.

## Key notes
- Inline auto-save status line lives at the bottom of the master column (there
  is no save/cancel pair — changes persist automatically).
- Reuses the existing `.nb-ai-*` styles; the page wrapper (`.nb-settings-*`) is
  added by `SettingsView` / app.css.

## Change history

### 2026-06-13 — created (adapted from onboarding/AiProviderSetupForm)
- **Motivation**: settings became a page; the form needed to render inline
  rather than inside a modal.
- **Goal**: keep the master-detail UI identical while dropping the modal scrim,
  the floating close button and the `onClose` prop.
- **Key decision**: return the `.nb-ai-split` content directly so it can be
  placed under the page heading; renamed to `AiSettingsForm` and moved into the
  `settings/` folder alongside its container.

### 2026-06-15 — add Account entry to master list
- **Motivation**: account management (profile, security, sessions, data export/delete)
  needs a home in the settings master-detail panel.
- **Changes**: added `"account"` to the `activePane` union; added an "Account" master-list
  row (shown only when signed in) under the "偏好设置" group; when `account` is active the
  detail pane renders `<AccountSection>` with the current user; added `useAuthUser` import
  and `authUser` local variable; the detail pane gets the `nb-ai-detail--account` modifier
  class for scrollable layout.

### 2026-06-15 — i18n Phase 1: Language pane + useT wiring
- **Motivation**: the settings page is a high-visibility surface; the language
  switcher lives here so users can always reach it even before other surfaces are
  migrated. The page title and other settings strings are also wired.
- **Changes**: imports `useLocale`, `useT` from `@/lib/i18n/LocaleContext` and
  `SUPPORTED_LOCALES`, `Locale` from `@/lib/i18n`; adds `"language"` to the
  `activePane` union; adds a "Language / 语言" master-list row under "偏好设置";
  adds `LanguagePane` component (renders one `nb-ai-prow` button per supported
  locale, active locale gets ✓ tag); `LanguagePane` calls `onSetLocale` which
  updates the LocaleContext and persists to localStorage — live update, no reload.

### 2026-06-15 — add Notifications entry to master list
- **Motivation**: wire in the new `NotificationSettings` component.
- **Changes**: added `"notifications"` to the `activePane` union; added a
  "通知" (Notifications) master-list row under a new "偏好设置" group; when
  `notifications` is active the detail pane renders `<NotificationSettings>`
  instead of the AI/websearch panels; added `userSignedIn` prop to
  `AiSettingsFormProps` to gate the notification settings query.
