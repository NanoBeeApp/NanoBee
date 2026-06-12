# OAuthButtons.tsx

## Responsibility
Pure render component: Google / GitHub sign-in buttons that navigate to the
server-side OAuth start endpoints (full-page redirect).

## Core exports / API
- `OAuthButtons` — props: `returnTo` (relative path to resume after login)

## Dependencies
- Upstream: React only; inline brand-mark SVGs (Google "G", GitHub mark)
- Downstream: `LoginCard.tsx`

## Notes
- Full-page navigation (not fetch) — the OAuth consent flow must own the
  whole window, and the session cookie is set during the callback redirect.
- Test anchors: `google-login-button`, `github-login-button`.

## Change history

### 2026-06-12 — created
- **Motivation**: requirement for Google/GitHub login entry points on the
  login page.
- **Goal**: provider buttons consistent with the design system
  (`btn btn-secondary`).
- **Key decision**: inline brand SVGs because the project icon set is
  generic-stroke only and brand marks must keep their official shapes
  and colors.

