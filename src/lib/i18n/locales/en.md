# src/lib/i18n/locales/en.ts

## Responsibility

English locale dictionary — partial translations for Phase 1 wired surfaces.

This file only needs to contain keys for surfaces that have been wired to i18n.
Missing keys fall back to the zh value at runtime (never blank).

## What is translated (Phase 1)

- `nav.*` — sidebar navigation labels.
- `newAction.*` — sidebar new-action button labels.
- `brand.tagline` — sidebar brand tagline.
- `emptyState.*` — chat empty state heading, subtitle, starter chip labels.
- `settings.*` — settings page text and the language switcher.

## Adding translations

When a new surface is wired (Phase 2+):
1. Add the keys to `zh.ts` first (zh is always the source of truth).
2. Translate here under the same key path.
3. Update `index.md` with the surface name.

## Change history

- 2026-06-15 — Created. Phase 1 i18n foundation.
- 2026-06-15 — Fixed TS2322 errors: widened `DeepPartial<T>` leaf type from `T[K]` to `string` so English translations do not have to match the exact Chinese string literals produced by `zh as const`.
