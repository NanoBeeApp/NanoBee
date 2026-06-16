# MobileHeader.tsx

## Responsibility
Mobile-only top bar (visible only at `<= 768px` via `mobile.css`). Provides:
- Hamburger / close button (left) that toggles the off-canvas sidebar drawer via
  `useAppStore.mobileNavOpen` / `setMobileNavOpen`.
- NanoBee bee logo + wordmark (centre) for quick brand orientation on small screens.
- Account avatar / dropdown (right) — re-uses `AccountFoot` unchanged.

The visual open/close state is handled purely in CSS: `_app.tsx` applies
`.mobile-nav-open` to `.nb-app` when `mobileNavOpen` is true; `mobile.css` then
slides the sidebar in and shows the scrim.

## Exports
- `MobileHeader` — functional component, no props.

## Dependencies
- `useAppStore` (reads `mobileNavOpen`, writes via `setMobileNavOpen`)
- `Icons` (panelLeft, x, bee)
- `AccountFoot` (account dropdown — unchanged from desktop)
- CSS: `nb-mobile-header`, `nb-mobile-hamburger`, `nb-mobile-brand`,
  `nb-mobile-header-right` — all defined in `mobile.css`.

## Change history

### 2026-06-15 — created
- **Motivation**: mobile-responsive pass; the two-column desktop shell has no
  header and no hamburger; phones need a visible header to access navigation.
- **Key decisions**: re-use `AccountFoot` rather than duplicating the dropdown;
  hide via CSS (`display:none` on desktop, `display:flex` inside the media
  query) so there is no JS viewport check needed.
