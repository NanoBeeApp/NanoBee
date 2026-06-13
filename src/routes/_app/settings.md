# _app/settings.tsx

## Responsibility
Route `/settings` — renders the AI model & web-search configuration page
(`SettingsView`) into the `_app` layout outlet. This is the surface that was
formerly the `AiProviderSetupDialog` modal.

## Core exports
- `Route` — `createFileRoute("/_app/settings")` with `component: SettingsView`.

## Dependencies
- Upstream: `@tanstack/react-router`, `@/components/settings/SettingsView`.
- Downstream: none.

## Change history

### 2026-06-13 — created
- **Motivation**: the user asked to turn settings from a modal into a real page
  with its own URL.
- **Goal**: `/settings` is a first-class, deep-linkable page; the modal dialog
  (and its first-login auto-open) is removed in favor of this route.
