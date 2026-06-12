# vite.config.ts

## Responsibility
Vite configuration for the full-stack app: TanStack Start (SSR + file-based
routing), the Cloudflare Workers runtime plugin, Tailwind CSS 4 and tsconfig
path aliases.

## Key points
- `cloudflare({ viteEnvironment: { name: "ssr" } })` runs dev requests through
  the workerd runtime so D1/bindings behave like production.
- `CLOUDFLARE_ENV` (from `.env.dev` / `.env.prod`) selects the wrangler env
  section at build time.
- Plugin order matters: devtools → cloudflare → paths → tailwind →
  tanstackStart → react.

## Change history

### 2026-06-12 — created (SPA)
- **Motivation**: first frontend prototype needed a minimal React SPA build.

### 2026-06-12 — replaced with full-stack config
- **Motivation**: initialize the production stack from the
  init-hono-tanstack-rpc template (Cloudflare Workers + D1 deployment target).
- **Goal**: same vite entry serves SSR shell, static assets and Hono /api.
- **Key decision**: kept the template plugin chain verbatim minus its no-op
  hono-api-info logging plugin.
