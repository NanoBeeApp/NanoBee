# functions.ts

## Responsibility
TanStack Start server functions — SSR-friendly RPC examples (`getHello`,
`getHealth`) mirroring the Hono smoke-test endpoints.

## Dependencies
- Upstream: `@tanstack/react-start`
- Downstream: route components that prefer server functions over /api calls

## Change history

### 2026-06-12 — created
- **Motivation**: template init; keep one minimal example of each RPC style
  (Hono RPC and server functions) so future features can pick the right tool.
