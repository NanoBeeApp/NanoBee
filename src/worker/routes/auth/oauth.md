# oauth.ts

## Responsibility
Google / GitHub OAuth (authorization-code flow): consent redirect with
HMAC-signed state, code exchange, profile fetch, user resolution
(link-by-verified-email or create) and session issuance.

## Core exports / API
- `oauthRoutes` — Hono sub-app:
  - `GET /:provider/start?returnTo=` → 302 to the provider consent page
    | `501 provider_not_configured` | `500 auth_secret_missing`
  - `GET /:provider/callback?code&state` → 302 to `returnTo` on success,
    302 to `/login?error=<code>` on any failure

## Dependencies
- Upstream: `../../config` (provider endpoints, state TTL),
  `../../auth/{crypto,cookies,store}`
- Downstream: `routes/auth/index.ts`, `OAuthButtons.tsx`

## Notes
- State = HMAC-SHA256-signed `{ provider, returnTo, nonce, issuedAt }`,
  10 min TTL, signed with `AUTH_SECRET` — no server-side state storage.
- `returnTo` only accepts same-origin relative paths (open-redirect guard).
- Account merge into an existing user happens **only** when the provider
  reports the email as verified; otherwise a separate user is created
  (prevents account takeover by claiming someone's address).
- GitHub: public profile email is often empty → `/user/emails` is queried
  for the primary verified address; requests need a `User-Agent` header.
- `redirect_uri` is derived from the request origin, so the same code works
  on localhost, dev and prod without configuration.

## Change history

### 2026-06-12 — created
- **Motivation**: requirement for Google + GitHub login without pulling in
  the members project or a heavyweight auth framework.
- **Goal**: a complete, self-contained two-provider flow with safe account
  merging, following the custom social-auth design proven in
  windchat-members.
- **Key decision**: skip PKCE (confidential client with a server-held
  secret; state covers CSRF) and keep provider config in `CONFIG.AUTH`
  with credentials in secrets.
