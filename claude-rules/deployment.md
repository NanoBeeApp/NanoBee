# 🚀 Domains & deployment

> Split from CLAUDE.md on 2026-06-15. This is an inseparable part of the CLAUDE.md rules (loaded on demand to keep the always-on context small). Must be fully followed when relevant; violating it equals violating CLAUDE.md.

- **Domain**: `nanobee.app` (Cloudflare zone in this account).
  - Production worker `nanobee` → `nanobee.app`
  - Dev worker `nanobee-dev` → `dev.nanobee.app`
  - Both are Workers Custom Domains declared in `wrangler.json` (`routes` with `custom_domain: true`); wrangler manages DNS + certificates on deploy.
- **Default deploy target is the dev environment only** (`pnpm deploy:dev`). **Never deploy to production unless the user explicitly asks for it in the current request** (`pnpm deploy:prod`). This project rule overrides the global "always deploy dev and prod together" preference.
