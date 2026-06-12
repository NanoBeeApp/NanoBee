# src/icons/icons.tsx

## Responsibility
Inline SVG line-icon set (Lucide-class, 24x24, rounded caps) ported 1:1 from the design prototype's nb-icons.jsx.

## Key exports
- `Icons`: Record<IconName, IconComponent>
- `Icon`: render-by-name wrapper with bell fallback
- `IconProps`

## Dependencies
- Upstream: react, src/types (IconName)
- Downstream: every component that shows an icon

## Key notes
- Icons stay inline (no icon font/library) per the design system's iconography rules.

## Change history

### 2026-06-12 — created
- **Motivation**: design handoff; keeping the exact prototype paths guarantees pixel-identical glyphs.

### 2026-06-12 — added `download` / `smartphone` / `monitor` icons
- **Motivation**: the sidebar "download apps" menu needs a download glyph
  for its trigger and platform glyphs (iOS / Mac) for its menu items.
- **Key decision**: standard Lucide paths, consistent with the set.

### 2026-06-12 — added `logout` icon
- **Motivation**: the sidebar account menu needed a clear sign-out glyph;
  the previously used `x` icon read as "close" and confused users.
- **Key decision**: standard Lucide `log-out` path so it stays consistent
  with the rest of the Lucide-class set.
