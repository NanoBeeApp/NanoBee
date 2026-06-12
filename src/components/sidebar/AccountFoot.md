# AccountFoot.tsx

## Responsibility
Sidebar footer account area: shows an avatar-only button for the signed-in
user — clicking it opens a popover menu with identity info (name + email)
and a logout action — or a login/register entry linking to `/login`.

## Core exports / API
- `AccountFoot` — no props; reads auth state via `useAuthUser()` and
  performs logout via `useLogout()`; menu open state is local `useState`

## Dependencies
- Upstream: `react` (useState), `@tanstack/react-router` (Link),
  `../../icons/icons`, `../../lib/useAuth`, `./SettingsMenu`
- Downstream: `Sidebar.tsx`
- Styles: `.nb-account-trigger` / `.nb-account-pop` / `.nb-account-id` /
  `.nb-account-action` in `src/styles/app.css`; reuses `.nb-scrim`

## Notes
- Avatar: provider image when available (`referrerPolicy="no-referrer"` for
  Google-hosted avatars), otherwise the first letter of the display name.
- Test anchors: `account-area`, `account-menu-trigger`, `account-menu`,
  `login-entry`, `logout-button`.

## Change history

### 2026-06-12 — created
- **Motivation**: the sidebar footer showed a hardcoded demo persona; with
  the auth system the shell must reflect real session state.
- **Goal**: a self-contained account widget so `Sidebar.tsx` stays a layout
  component.
- **Key decision**: render an empty footer while the session query loads to
  avoid a logged-out flash for returning users.

### 2026-06-12 — avatar-only trigger with popover menu
- **Motivation**: the inline name/email row with a bare `x` logout button
  read as "close" and felt confusing; users expected clicking the account
  area to open a menu.
- **Goal**: collapse the footer to a single avatar; move identity info and
  logout into a popover menu opened by clicking the avatar.
- **Key decision**: reuse the existing scrim + popover pattern from the
  notification dropdown (local state, `.nb-scrim` overlay, `z-index: 60`
  popover anchored above the footer) instead of pulling in a menu library.

### 2026-06-12 — added DownloadAppsMenu next to the avatar
- **Motivation**: users need a discoverable entry to the native iOS/Mac
  apps; the footer next to the avatar is the natural spot.
- **Key decision**: keep it as a separate self-contained component
  (`DownloadAppsMenu`) so AccountFoot stays focused on auth state; the
  footer became a flex row to host both triggers.

### 2026-06-12 — "AI 模型设置" menu entry
- **Motivation**: users need a way to revisit their AI provider settings
  after onboarding; the account popover is the existing home for
  account-level actions.
- **Goal**: a menu action that sets `aiSetupOpen` in the app store, opening
  the same dialog used on first login (edit mode).

### 2026-06-12 — DownloadAppsMenu renamed to SettingsMenu
- **Motivation**: the footer's download icon button was repurposed as a
  general settings button (gear) whose menu hosts the download links.
- **Key decision**: only the import/usage changed here; the menu remains a
  separate self-contained component.
