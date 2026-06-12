# AccountFoot.tsx

## Responsibility
Sidebar footer account area: shows the signed-in user (avatar, name, email,
logout button) or a login/register entry linking to `/login`.

## Core exports / API
- `AccountFoot` — no props; reads auth state via `useAuthUser()` and
  performs logout via `useLogout()`

## Dependencies
- Upstream: `@tanstack/react-router` (Link), `../../icons/icons`,
  `../../lib/useAuth`
- Downstream: `Sidebar.tsx`

## Notes
- Avatar: provider image when available (`referrerPolicy="no-referrer"` for
  Google-hosted avatars), otherwise the first letter of the display name.
- Test anchors: `account-area`, `account-summary`, `login-entry`,
  `logout-button`.

## Change history

### 2026-06-12 — created
- **Motivation**: the sidebar footer showed a hardcoded demo persona; with
  the auth system the shell must reflect real session state.
- **Goal**: a self-contained account widget so `Sidebar.tsx` stays a layout
  component.
- **Key decision**: render an empty footer while the session query loads to
  avoid a logged-out flash for returning users.
