# EmailAuthForm.tsx

## Responsibility
Pure render component: the email + password form used by both the
"login" and "register" modes (register adds a nickname field).

## Core exports / API
- `EmailAuthForm` — fully controlled via props (`mode`, field values,
  `error`, `pending`, change/submit/switch callbacks); no internal state

## Dependencies
- Upstream: React only (design-system CSS classes `field` / `input` / `btn`)
- Downstream: `LoginCard.tsx`

## Notes
- Test anchors: `login-email-input`, `login-password-input`,
  `register-name-input`, `email-auth-submit`, `auth-mode-switch`,
  `auth-error-message`.
- Native HTML validation (required / minLength) backs up the server-side
  zod rules.

## Change history

### 2026-06-12 — created
- **Motivation**: login and register share almost the whole form; two
  copies would drift. Repo rules require pure render components.
- **Goal**: one props-driven form covering both modes.
- **Key decision**: `mode` prop instead of two components — the only
  difference is the nickname field and copy.
