# useAccount.ts

## Responsibility
React Query hooks for all account management operations. Wraps the
`/api/auth/*` account endpoints with typed mutations and queries.

## Exports
- `ACCOUNT_ERROR_MESSAGES` — stable error-code → user-facing copy map
- `accountMessageFor(code)` — safe lookup with a fallback
- `useForgotPassword()` — mutation: send a reset code email
- `useResetPassword()` — mutation: verify code, set new password
- `useChangeName()` — mutation: update display name (invalidates auth user query)
- `useChangePassword()` — mutation: change password with current-password check
- `SESSIONS_QUERY_KEY` — query key for session list
- `useSessions()` — query: active sessions with `current` flag
- `useRevokeSession()` — mutation: revoke one or all-others sessions
- `useExportData()` — mutation: download JSON export via blob URL
- `useDeleteAccount()` — mutation: purge account, then navigate to /login
- `SessionItem` type

## Dependencies
- Upstream: `./useAuth` (AUTH_USER_QUERY_KEY), `@tanstack/react-query`
- Downstream: `components/settings/AccountSection.tsx`

## Notes
- All mutations throw with the server error code as the message so callers
  can display `accountMessageFor(error.message)`.
- `useExportData` uses a temporary anchor element + `URL.createObjectURL`
  to trigger the browser's save dialog — no page navigation.
- `useDeleteAccount` calls `queryClient.clear()` then `window.location.href`
  (hard reload) so there are no stale cache entries after deletion.

## Change history & rationale

- 2026-06-15 — `SessionItem.lastSeenAt` changed to `number | null` to match
  the nullable DB column introduced by migration 0016 fix.
- 2026-06-15 — initial creation for account management feature (agent run).
