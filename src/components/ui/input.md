# input.tsx

## Responsibility
shadcn/ui "input" primitive (new-york style), vendored unmodified from the
project template. Kept even when currently unused, per repo convention.

## Core exports / API
See the component's named exports — standard shadcn/ui input API built on
Radix UI primitives where applicable.

## Dependencies
- Upstream: Radix UI primitives / class-variance-authority / @/lib/utils (cn)
- Downstream: any feature component that needs a input

## Notes
Do not hand-edit casually; regenerate or update via
`pnpm dlx shadcn@latest add input` to stay aligned with upstream.

## Change history

### 2026-06-12 — created
- **Motivation**: full-stack scaffolding from the init-hono-tanstack-rpc
  template; shadcn/ui primitives vendored as the base component library.
- **Goal**: provide ready-to-use UI primitives without re-adding them later.
- **Key decision**: keep all template primitives (including unused ones) as
  spares, per repo convention.
