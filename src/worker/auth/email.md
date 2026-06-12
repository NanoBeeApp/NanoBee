# email.ts

## Responsibility
Verification-email delivery through the Resend HTTP API, with a local-dev
fallback that logs the code to the console.

## Core exports / API
- `sendVerificationCode(env, email, code)` → `boolean` — sends the 6-digit
  code email; returns false on delivery failure

## Dependencies
- Upstream: `../config` (TTL, default sender), `../api-worker` (Env type)
- Downstream: `routes/auth/email.ts` (register / resend / unverified login)

## Notes
- `LOG_EMAIL_CODES=1` (dev only) logs the plaintext code so the flow can be
  exercised without a mailbox; never set it in production.
- Sender priority: `EMAIL_FROM` var → `CONFIG.AUTH.DEFAULT_EMAIL_FROM`.
  The sender domain must be verified in the Resend account or the API
  returns 403.
- Calls Resend with plain `fetch` (no SDK) to keep the worker lean.

## Change history

### 2026-06-12 — created
- **Motivation**: email registration needs proof of mailbox ownership; the
  project already had a Resend API key available.
- **Goal**: one delivery function shared by register / resend / login flows,
  testable locally without reading a mailbox.
- **Key decision**: inline HTML template (single transactional mail) and an
  env-gated console fallback instead of a mock mail service.
