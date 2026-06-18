# src/store/useSettingsNav.ts

## Responsibility
Tiny in-memory zustand store holding the single piece of state shared between the
left app sidebar's settings category list (`SettingsNavList`) and the /settings
page (`AiSettingsForm`): the **active pane**. The sidebar writes it when a
category is clicked; the page reads it to render the matching category's item
list + detail, and writes it when an item is clicked.

## Core exports
- `useSettingsNav` — `{ activePane, setActivePane }`. Default `activePane` is
  `'ai-model'` (the AI-model pane inside the 通用 category), the same landing pane
  the page used when it owned this state locally.

## Dependencies
- Upstream: `zustand`, the `PaneId` type from `components/settings/settings-nav`
  (type-only import — no runtime cycle).
- Downstream: `components/settings/AiSettingsForm`,
  `components/sidebar/SettingsNavList`.

## Key notes
- No persistence — the selection only needs to survive while the app is mounted,
  mirroring the previous local `useState` on the page. Lifting it to a store is
  what lets the sidebar (a sibling component) drive the page.

## Change history

### 2026-06-18 — created
- **Motivation**: moving the settings categories into the sidebar split the
  former 3-column page across two components; they need to share which pane is
  active. A store is the cleanest seam (no prop-drilling through the app shell).
- **Goal**: lift the page's local `activePane` state up so the sidebar category
  list and the page item/detail panes read and write the same value.
