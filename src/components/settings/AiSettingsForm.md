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
