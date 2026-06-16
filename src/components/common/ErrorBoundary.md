# ErrorBoundary.tsx

## Responsibility
Global React error boundary that catches uncaught render / lifecycle errors and
shows an on-brand white fallback (NanoBee logo, heading, reload + back-to-chat
buttons, and a collapsed `<details>` block with the stack trace) instead of a
blank white screen.

Also exports `RouteErrorFallback` — a functional component used as TanStack
Router's `errorComponent` prop so individual route failures are isolated and
show the same visual treatment without crashing the shell.

## Exports
- `ErrorBoundary` — class component; wrap around any subtree (used in `__root.tsx`
  to cover the whole app).
- `RouteErrorFallback` — props `{ error: Error; reset: () => void }` matching
  TanStack Router's `errorComponent` signature; used in `_app.tsx` and
  individual route files.

## Dependencies
- No external runtime dependencies (avoids zustand/router so it can safely render
  even when those are broken).
- CSS: `nb-error-boundary`, `nb-error-card`, etc. — defined in `app.css`.

## Change history

### 2026-06-15 — created
- **Motivation**: the app had no render-error recovery — any crash in a React
  component produced a blank white screen with no user affordance to recover.
- **Design**: error boundary mounted at the root (`__root.tsx`) captures all
  subtree errors; a second functional variant (`RouteErrorFallback`) isolates
  per-route crashes so the rest of the shell keeps working.
- **Key decisions**: inline SVG bee logo (no dependency on Icons or store) so the
  boundary renders reliably even when other modules are broken; `<details>` for
  stack trace so it's available for debugging but not prominent for end users;
  white / Radix-token styling matching the rest of the app — no dark theme.
