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
