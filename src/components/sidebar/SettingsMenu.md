# SettingsMenu.tsx

## Responsibility
Sidebar footer settings button: a gear icon button at the right edge of the
footer that opens a popover menu. Currently hosts the native app download
links (iOS / Mac); future footer-level utility entries also belong here.

## Core exports / API
- `SettingsMenu` — no props; menu open state is local `useState`

## Dependencies
- Upstream: `react` (useState), `../../icons/icons`, `../../config`
  (`APP_DOWNLOAD_LINKS`)
- Downstream: `AccountFoot.tsx`
- Styles: `.nb-settings-trigger` / `.nb-settings-pop` in `src/styles/app.css`;
  reuses `.nb-scrim`, `.nb-account-action`, `.nb-account-sep`

## Notes
- The popover is absolutely positioned against `.nb-side-foot`
  (`position: relative`), same anchoring pattern as the account menu.
- Links open in a new tab (`target="_blank"` + `rel="noopener noreferrer"`).
- Test anchors: `settings-menu-trigger`, `settings-menu`,
  `download-ios-link`, `download-mac-link`.

## Change history

### 2026-06-12 — created (as DownloadAppsMenu)
- **Motivation**: users had no way to discover the native iOS/Mac apps from
  the web app; the sidebar footer (next to the avatar) is the natural home
  for account-adjacent utility entries.
- **Goal**: a self-contained download menu mirroring the account menu's
  scrim + popover interaction so the footer stays consistent.
- **Key decision**: link targets come from `APP_DOWNLOAD_LINKS` in the
  shared config (site-level redirect URLs) instead of hardcoded store URLs.

### 2026-06-12 — right-aligned the trigger
- **Motivation**: user feedback — the download button should sit at the
  right edge of the footer, not next to the avatar.
- **Key decision**: `margin-left: auto` on the trigger and the popover
  anchored to the footer's right edge (`right: 10px`), both in CSS only.

### 2026-06-12 — renamed DownloadAppsMenu → SettingsMenu
- **Motivation**: user feedback — a bare download icon in the footer is too
  narrow a purpose; it should read as a general settings entry whose menu
  contains the download links.
- **Goal**: gear trigger (new `gear` icon) opening the same popover; download
  links move inside the menu. CSS classes renamed `nb-apps-*` →
  `nb-settings-*`; trigger test anchor renamed to `settings-menu-trigger`.
- **Key decision**: keep the component as the single footer utility menu so
  future entries (preferences, shortcuts, …) slot in without another trigger.
