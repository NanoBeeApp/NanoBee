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

### 2026-06-15 — added `stop` icon
- **Motivation**: the chat composer's stop-generating button needed a filled
  rounded-square glyph (added to `IconName` in `types.ts` too).

### 2026-06-15 — added `table` icon
- **Motivation**: the Artifacts gallery view switch needed a table glyph (list / table / card).

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

### 2026-06-12 — added `gear` icon
- **Motivation**: the sidebar footer download button became a settings
  (gear) button whose menu hosts the app download links.

### 2026-06-12 — replaced the hand-drawn gear with Font Awesome's solid gear
- **Motivation**: user feedback — the hand-approximated stroke gear looked
  odd; a polished, detail-rich glyph was wanted.
- **Key decision**: inline the Font Awesome 6 Free "gear" (solid) path
  directly (own 512 viewBox, `fill="currentColor"`) instead of adding the
  FA library as a dependency, keeping the icon set dependency-free.

### 2026-06-12 — switched the gear to the Lucide line-style glyph
- **Motivation**: user feedback — the solid FA gear clashed with the
  stroke-based icon set; a line icon was wanted.
- **Key decision**: use Lucide's "settings" gear path inside the shared
  `Svg` stroke wrapper so it inherits the set's stroke width and color.
