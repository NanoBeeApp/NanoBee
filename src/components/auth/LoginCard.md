# LoginCard.tsx

## Responsibility
State component for the login page: owns the flow state
(login / register / verify-email), calls the `/api/auth` endpoints and maps
server error codes to user-facing Chinese copy. Rendering is delegated to
the pure form components.

## Core exports / API
- `LoginCard` — no props; renders `OAuthButtons` + `EmailAuthForm` or
  `VerifyEmailForm` depending on the mode

## Dependencies
- Upstream: `@tanstack/react-router` (navigate), `@tanstack/react-query`,
  `@/lib/api-client`, `@/lib/useAuth` (query key), `./EmailAuthForm`,
  `./VerifyEmailForm`, `./OAuthButtons`
- Downstream: `src/routes/login.tsx`

## Notes
- OAuth callback failures arrive as `/login?error=<code>`; the code is read
  once on mount and rendered through the same error-message map.
- Successful auth invalidates `AUTH_USER_QUERY_KEY` then navigates to `/`.
- An unverified login (403 + `needsVerification`) switches straight to the
  verify step — the server has already re-sent a code.

## Change history

### 2026-06-12 — created
- **Motivation**: the auth flow has three UI states sharing fields (email
  carries from register into verify); per repo rules state and pure
  rendering must be separate components.
- **Goal**: single container holding flow state + API calls, with dumb
  form children.
- **Key decision**: server returns stable error codes and the client owns
  the copy — keeps API responses locale-free.
