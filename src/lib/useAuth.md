# useAuth.ts

## Responsibility
Auth state hooks for the React layer: current user query and logout
mutation, both backed by the typed RPC client.

## Core exports / API
- `useAuthUser()` — TanStack Query for `GET /api/auth/me`
  (key `AUTH_USER_QUERY_KEY`, 60s staleTime), returns `SessionUser | null`
- `useLogout()` — mutation for `POST /api/auth/logout`, clears the cached
  user on success
- `SessionUser` type, `AUTH_USER_QUERY_KEY`

## Dependencies
- Upstream: `@tanstack/react-query`, `./api-client`
- Downstream: `AccountFoot.tsx`, `LoginCard.tsx` (invalidates the key)

## Change history

### 2026-06-12 — created
- **Motivation**: both the sidebar and the login flow need the same
  "who am I" state; duplicating fetch logic in components would desync.
- **Goal**: one query key as the single source of truth for auth state.
- **Key decision**: `user: null` (not an error) models the anonymous state,
  so components can distinguish "loading" from "signed out".
