# login.tsx

## Responsibility
Standalone auth page route (`/login`): brand header + `LoginCard` + legal
footnote. No app sidebar.

## Core exports / API
- `Route` — TanStack Start file route, `ssr: false`, with login-specific
  `title` / `description` meta

## Dependencies
- Upstream: `@tanstack/react-router`, `@/icons/icons`,
  `@/components/auth/LoginCard`
- Downstream: route tree (`routeTree.gen.ts`), linked from `AccountFoot`
  and from OAuth error redirects (`/login?error=...`)

## Notes
- Client-only (`ssr: false`) like the home route: the flow is fully
  interactive and has no SEO-relevant content.
- Layout/styles live in `src/styles/app.css` under the AUTH section
  (`nb-auth-*` classes).

## Change history

### 2026-07-02 — brand tile shows the real bee logo
- **Change**: the `.nb-auth-brand .glyph` tile now renders the real logo image
  (`/brand/nanobee-bee.png`) on a cream app-icon tile instead of the inline
  `Icons.bee` glyph; dropped the now-unused `Icons` import.

### 2026-06-12 — created
- **Motivation**: the auth system needs a dedicated page outside the app
  shell — an embedded modal would complicate OAuth redirects.
- **Goal**: minimal page chrome; all flow logic stays in LoginCard.
- **Key decision**: `/login` is also the landing target for OAuth errors,
  keeping a single surface for every auth message.
