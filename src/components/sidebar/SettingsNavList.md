# src/components/sidebar/SettingsNavList.tsx

## Responsibility
The sidebar scroll-area list shown while the app is on the Settings page. Renders
the setting **categories** (通用 / 研究画布 / 任务 / 聊天) that used to be the
settings page's leftmost column, under a "设置" group header. Selecting a category
drives the page (its items + detail) through the shared `useSettingsNav` store;
the matching category stays highlighted.

## Core export / API
- `SettingsNavList()` — self-contained; reads `activePane` / `setActivePane` from
  `useSettingsNav`, the category tree from `settings-nav`, and the "设置" label
  from `useT`.

## Dependencies
- Upstream: `useSettingsNav`, `settings-nav` (`buildCategories`,
  `categoryIdForPane`, `NavIcon`), `useT`.
- Downstream: `Sidebar` (rendered when `view === 'settings'`).

## Key notes
- Categories are auth-independent (only the items inside 通用 vary by sign-in), so
  it uses `buildCategories(false)` and `categoryIdForPane` — no auth hook needed.
- Clicking a category sets `activePane` to that category's first item; no
  navigation is needed because the list only renders while already on /settings.
- Uses the sidebar's native `.nb-grp` / `.nb-item` styling (with the `NavIcon`
  tint tile) so it matches the other per-page nav lists, rather than the page's
  `.nb-ai-prow` rows.

## Change history

### 2026-06-18 — created
- **Motivation**: the user asked to remove the settings page header, move the
  page's leftmost categories column into the left sidebar, and show a "设置"
  header at the top of that sidebar list when the Settings page is active.
- **Goal**: a per-page sidebar list (like `TasksNavList` / `ResearchNavList`) that
  surfaces the settings categories and drives the page through `useSettingsNav`.
