# src/lib/i18n/locales/zh.ts

## Responsibility

Chinese (Simplified) locale dictionary — the canonical baseline for all i18n keys.
Every key that exists in `en.ts` must also exist here; the reverse is not required
(en can be partial — missing en keys fall back to zh at runtime).

## Structure

Keys are grouped by surface/feature:
- `nav.*` — Sidebar navigation tile labels and mode switch.
- `newAction.*` — Sidebar page-aware "new" button labels.
- `brand.*` — Brand tagline in the sidebar header.
- `emptyState.*` — Chat empty state heading, subtitle, starter chip labels.
- `settings.*` — Settings page text including the language switcher.

## Adding keys

Add under the appropriate group, or create a new group if the surface is new.
Keep the zh values as the canonical user-facing Chinese strings. Do not add
English text here — that belongs in `en.ts`.

## Change history

- 2026-06-15 — Created. Phase 1 i18n foundation: nav, newAction, brand,
  emptyState, settings keys wired to Sidebar + EmptyState + Settings surfaces.
