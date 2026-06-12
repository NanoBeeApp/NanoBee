# VerifyEmailForm.tsx

## Responsibility
Pure render component: the 6-digit email verification step
(code input, resend and back-to-login actions).

## Core exports / API
- `VerifyEmailForm` — fully controlled via props (`email`, `code`, `error`,
  `pending`, `resendNotice`, callbacks); no internal state

## Dependencies
- Upstream: React only (design-system CSS classes)
- Downstream: `LoginCard.tsx`

## Notes
- Input strips non-digits and caps at 6 chars; submit stays disabled until
  exactly 6 digits are present.
- Test anchors: `verification-code-input`, `verification-code-submit`,
  `resend-code-button`, `back-to-login-button`, `verify-error-message`.

## Change history

### 2026-06-12 — created
- **Motivation**: the verify step is reached from two flows (register and
  unverified login) and must look identical in both.
- **Goal**: a single dumb component fed by LoginCard.
- **Key decision**: client-side digit filtering for ergonomics; the server
  still re-validates with a `\d{6}` schema.
