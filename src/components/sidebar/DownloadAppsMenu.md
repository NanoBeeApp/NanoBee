# DownloadAppsMenu.tsx

## Responsibility
Sidebar footer "download apps" button: an icon button next to the account
avatar that opens a popover menu with native app download links (iOS / Mac).

## Core exports / API
- `DownloadAppsMenu` — no props; menu open state is local `useState`

## Dependencies
- Upstream: `react` (useState), `../../icons/icons`, `../../config`
  (`APP_DOWNLOAD_LINKS`)
- Downstream: `AccountFoot.tsx`
- Styles: `.nb-apps-trigger` / `.nb-apps-pop` in `src/styles/app.css`;
  reuses `.nb-scrim`, `.nb-account-action`, `.nb-account-sep`

## Notes
- The popover is absolutely positioned against `.nb-side-foot`
  (`position: relative`), same anchoring pattern as the account menu.
- Links open in a new tab (`target="_blank"` + `rel="noopener noreferrer"`).
- Test anchors: `download-apps-trigger`, `download-apps-menu`,
  `download-ios-link`, `download-mac-link`.

## Change history

### 2026-06-12 — created
- **Motivation**: users had no way to discover the native iOS/Mac apps from
  the web app; the sidebar footer (next to the avatar) is the natural home
  for account-adjacent utility entries.
- **Goal**: a self-contained download menu mirroring the account menu's
  scrim + popover interaction so the footer stays consistent.
- **Key decision**: link targets come from `APP_DOWNLOAD_LINKS` in the
  shared config (site-level redirect URLs) instead of hardcoded store URLs.
