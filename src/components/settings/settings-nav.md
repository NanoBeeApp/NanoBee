# src/components/settings/settings-nav.tsx

## Responsibility
Single source of truth for the /settings navigation model, shared by the page
(`AiSettingsForm`) and the left app sidebar (`SettingsNavList`). Holds the
category → item tree, the pane→category derivation, the tinted-icon tile and the
`PaneId` / `CategoryId` types so both consumers stay in sync after the categories
moved out of the page and into the sidebar.

## Core exports
- `buildCategories(signedIn)` — the category → item tree (the Account item only
  appears when signed in). Used by the page to render the active category's items.
- `categoryIdForPane(pane)` — resolve which category a pane belongs to without
  needing the signed-in flag (the sidebar uses it to highlight the active
  category; Account lives in `general`, which is also the fallback, so the result
  is auth-stable).
- `NavIcon` — the small tinted logo tile used by category / item rows.
- Tints `TINT_BRAND` / `TINT_SKY` / `TINT_GREEN` / `TINT_GREY`.
- Types `PaneId`, `CategoryId`, `NavItem`, `NavCategory`.

## Dependencies
- Upstream: `@/icons/icons`.
- Downstream: `AiSettingsForm` (items + detail), `sidebar/SettingsNavList`
  (categories), `store/useSettingsNav` (imports the `PaneId` type only).

## Key notes
- Category labels are auth-independent; only the items inside 通用 vary by
  sign-in, so the sidebar can call `buildCategories(false)` safely.
- Lint emits `react-refresh/only-export-components` warnings because the file
  exports a component (`NavIcon`) alongside constants/functions — the same
  accepted pattern as `icons.tsx` / `button.tsx` / `LocaleContext.tsx`.

## Change history

### 2026-06-18 — created (extracted from AiSettingsForm)
- **Motivation**: the user asked to move the settings page's leftmost column (the
  categories) into the left app sidebar. Both the sidebar and the page now need
  the same nav model, so it was lifted out of `AiSettingsForm` into this shared
  module.
- **Changes**: moved `PaneId` / `CategoryId` / `NavItem` / `NavCategory`, the four
  tints, `buildCategories` and `NavIcon` here verbatim; added `categoryIdForPane`
  so the sidebar can derive the active category without the signed-in flag.
