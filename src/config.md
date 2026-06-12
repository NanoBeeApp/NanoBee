# config.ts

## Responsibility
Shared frontend configuration: cross-component constants and external links
(currently the native app download links).

## Core exports / API
- `APP_DOWNLOAD_LINKS` — `{ ios, mac }` download URLs pointing at
  site-level redirect paths under `nanobee.app/download/*`

## Dependencies
- Upstream: none
- Downstream: `components/sidebar/SettingsMenu.tsx`

## Notes
- The `/download/ios` and `/download/mac` redirect endpoints are not wired
  up yet — once the apps are published, implement them in the worker (or as
  Cloudflare redirect rules) to point at the App Store listing / installer.

## Change history

### 2026-06-12 — created
- **Motivation**: the sidebar gained a "download apps" menu that needs
  iOS/Mac links; per project convention constants must live in a unified
  config file rather than inline in components.
- **Key decision**: use stable site-level redirect URLs instead of direct
  store/installer URLs, so future link changes don't require a frontend
  release.
