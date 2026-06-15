# AccountSection.tsx

## Responsibility
Account management pane for the `/settings` master-detail panel.
Rendered when the user clicks the "Account" row in the left master list
(inside `AiSettingsForm`). Requires the user to be signed in.

## Sub-sections

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

## Props
- `user: SessionUser` — the currently signed-in user (from `useAuthUser`)

## Dependencies
- `../../lib/useAccount` (all account mutations + session query)
- `../../lib/useAuth` (SessionUser type)
- `../../icons/icons` (Icons)

## Notes
- All error messages come from `accountMessageFor()` (stable code → copy map).
- Session rows use a simple UA string parse for human-readable device names.
- The delete confirm requires the literal string "DELETE" to prevent accidents.

## Change history & rationale

- 2026-06-15 — handle nullable `lastSeenAt` in SessionsSection: display
  "unknown" instead of passing null to `formatRelativeTime`.
- 2026-06-15 — initial creation for account management feature (agent run).
