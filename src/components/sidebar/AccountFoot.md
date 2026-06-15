# AccountFoot.tsx

## Responsibility
Top-right corner account control — the *sole* control in `FloatingControls`'s
`.nb-float.tr` (the standalone notification bell and settings gear were folded
into its menu). A single avatar + dropdown-caret pill: the avatar is on the
left, the caret to its right; clicking opens one unified dropdown that gathers
identity info, recent updates (notifications), AI model settings, native app
downloads and logout. When signed out the same pill shows a bee glyph and the
menu offers login/register plus the shared settings actions.

## Core exports / API
- `AccountFoot` — no props; reads auth state via `useAuthUser()` and
  performs logout via `useLogout()`; menu open state is local `useState`

## Dependencies
- Upstream: `react` (useState), `@tanstack/react-router` (Link),
  `../../icons/icons`, `../../config` (`APP_DOWNLOAD_LINKS`),
  `../../lib/useAuth`, `../../store/useAppStore`
- Downstream: `FloatingControls.tsx` (rendered inside the top-right float)
- Styles: `.nb-corner-account` / `.nb-corner-ctrl` / `.nb-account-trigger` /
  `.nb-account-pop` / `.nb-account-id` / `.nb-account-action` in
  `src/styles/app.css`; the avatar button reuses the `.fbtn` floating-button
  chrome; reuses `.nb-scrim`

## Notes
- Avatar: provider image when available (`referrerPolicy="no-referrer"` for
  Google-hosted avatars), otherwise the first letter of the display name.
- The popover opens downward and right-aligned to its `.nb-corner-ctrl`
  anchor (the control moved from the sidebar bottom to the page top-right).
- Test anchors: `account-area`, `account-menu-trigger`, `account-menu`,
  `login-entry`, `logout-button`.

## Change history

### 2026-06-15 — add "Account" entry to the signed-in menu
- **Motivation**: users need a quick path from the account popover to the Account
  settings pane (profile, security, sessions, data export/delete).
- **Change**: added "Account" button (Icons.at) below "AI 模型设置" in the signed-in
  menu; it calls `openSettings()` like the AI model settings entry — the Account pane
  is reached by clicking "Account" in the left master list of /settings.

### 2026-06-13 — "AI 模型设置" (AI Model Settings) navigates to /settings (was: open modal)
- **Motivation**: settings became a page with its own URL instead of a modal.
- **Change**: both account-menu "AI 模型设置" entries (signed-in and signed-out)
  now call `openSettings()` (router navigation) after closing the menu; the
  `setAiSetupOpen` import was replaced by `openSettings`.

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

### 2026-06-12 — "AI 模型设置" (AI Model Settings) menu entry
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

### 2026-06-13 — moved to the top-right corner
- **Motivation**: user request — move the sidebar's user icon and settings
  button to the page's top-right corner, so the left rail focuses on
  navigation and the chat lists.
- **Goal**: the avatar + settings gear live in the top-right floating bar
  alongside the notification bell.
- **Key decision**: render `AccountFoot` inside `FloatingControls`'s
  `.nb-float.tr` instead of the sidebar footer; the avatar reuses the `.fbtn`
  chrome to match the bell/gear; the popovers flip from opening upward to
  opening downward, right-aligned to each `.nb-corner-ctrl`; the signed-out
  entry becomes an icon button to fit the compact bar.

### 2026-06-13 — sole top-right control, caret on the right
- **Motivation**: user request — the top-right should show *only* the user
  avatar (drop the standalone bell) with the dropdown caret on the right.
- **Goal**: one account pill that absorbs every other top-right action.
- **Key decision**: drop the `SettingsMenu` import; the bell becomes a
  「最近动态」(Recent Updates) menu entry (still drives `setNotifOpen`) and the gear's download
  links move inline. The trigger stops being a square `.fbtn` (whose centered
  grid stacked the caret *under* the avatar and clipped it) and becomes a
  horizontal pill — `.nb-account-trigger` is now `inline-flex` with `width:auto`
  so the 26px avatar sits left and `chevD` sits to its right.
