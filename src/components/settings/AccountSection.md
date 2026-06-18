# AccountSection.tsx

## Responsibility
Account management pane for the `/settings` master-detail panel.
Rendered when the user clicks the "Account" row in the left master list
(inside `AiSettingsForm`). Requires the user to be signed in.

## Sub-sections

### IdentityHeader
Compact header at the very top of the pane: avatar (image, or initials fallback
ported from the old `AccountFoot`) + display name + email. This is the identity
marker the removed top-right avatar dropdown used to show.

### ProfileSection
Change display name via `PATCH /api/auth/account/name`. Shows the current
email read-only.

### SecuritySection
Change password (current password required) via `POST /api/auth/account/password`.
Show/hide eye toggles on all password fields. Validates that new password
≥ 8 chars and confirm matches before enabling submit.

### SessionsSection
Lists active sessions from `GET /api/auth/sessions` with device label
(simple UA parse), last-seen time, IP, and a "Sign out" button per session
(except the current one). "Sign out others" button revokes all non-current
sessions at once.

### DataSection
- **Export**: triggers `GET /api/auth/export` download as a JSON file.
- **Delete account**: two-step flow — click "Delete" to reveal a confirm
  box, type "DELETE" exactly, then submit. On success the page hard-navigates
  to /login.

### AppsSection
"Apps & session": native iOS / Mac app download buttons (`APP_DOWNLOAD_LINKS`)
and a "Sign out" button (`useLogout`). These moved here from the removed
top-right avatar dropdown so no account action was lost.

## Props
- `user: SessionUser` — the currently signed-in user (from `useAuthUser`)

## Dependencies
- `../../lib/useAccount` (all account mutations + session query)
- `../../lib/useAuth` (SessionUser type, `useLogout`)
- `../../config` (`APP_DOWNLOAD_LINKS`)
- `../../icons/icons` (Icons)

## Notes
- All error messages come from `accountMessageFor()` (stable code → copy map).
- Session rows use a simple UA string parse for human-readable device names.
- The delete confirm requires the literal string "DELETE" to prevent accidents.

## Change history & rationale

- 2026-06-18 — became the single account home after the top-right avatar
  dropdown was removed. Added `IdentityHeader` (avatar + name + email) at the
  top and `AppsSection` (app downloads + sign out) at the bottom, so logout and
  downloads — previously only in the avatar menu — stay reachable. Recent-updates
  ("最近动态") was not relocated: its content already lives on the Today page.
- 2026-06-15 — handle nullable `lastSeenAt` in SessionsSection: display
  "unknown" instead of passing null to `formatRelativeTime`.
- 2026-06-15 — initial creation for account management feature (agent run).
