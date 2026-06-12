# vite.config.ts

## Responsibility
Vite build/dev configuration for the NanoBee SPA (React plugin, dev port 5173).

## Key exports
Default Vite config object.

## Dependencies
- Upstream: vite, @vitejs/plugin-react
- Downstream: consumed by `pnpm dev` / `pnpm build`

## Change history

### 2026-06-12 — created
- **Motivation**: implement the Claude Design handoff (NanoBee.html) as a real React app; needed a minimal, conventional build setup.
- **Decision**: plain Vite + React SPA — the design is a fully client-side prototype, no SSR needed yet.
