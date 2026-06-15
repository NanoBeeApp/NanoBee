# ForgotPasswordForm.tsx

## Responsibility
Pure render components for the two-step password-reset flow on the /login page.

## Exports

### `ForgotPasswordForm`
Step 1: collects the user's email and triggers `POST /api/auth/forgot-password`.
Designed to be plugged into LoginCard's flow as a new `mode`.

### `ResetPasswordForm`
Step 2: collects the 6-digit code (shown as a monospace centered input like
the email verification form) plus new password + confirm. Validates local
mismatch before submit. Triggers `POST /api/auth/reset-password`.

## Props (ForgotPasswordForm)
- `email`, `error`, `notice`, `pending` — controlled state from LoginCard
- `onEmailChange`, `onSubmit`, `onBack` — callbacks

## Props (ResetPasswordForm)
- `email` (display-only), `code`, `password`, `confirmPassword`
- `error`, `pending`, callbacks for all fields + submit + back

## Notes
- Password mismatch is validated client-side (disables submit + shows hint).
- Code input strips non-digits and limits to 6 chars for UX.
- Notice (green) vs. error (red) follow the pattern of VerifyEmailForm.

## Change history & rationale

- 2026-06-15 — initial creation for account management feature (agent run).
