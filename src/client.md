# client.tsx

## Responsibility
Browser entry: hydrates the SSR-rendered document with `<StartClient />`.

## Notes
`StartClient` takes no props in @tanstack/react-start 1.139+ — the router
instance is resolved internally from `src/router.tsx` (the plugin's "router
entry" convention). Passing a `router` prop is a type error.

## Change history

### 2026-06-12 — created
- **Motivation**: template init; updated from the template's older
  `<StartClient router={router} />` API to the current prop-less API.
