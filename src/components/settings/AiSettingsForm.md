# src/components/settings/AiSettingsForm.tsx

## Responsibility
Pure render component for the /settings page. Two-column layout: the active
category's **items** (left) → the selected item's **detail** pane (right). The
setting **categories** (通用 / 研究画布 / 任务 / 聊天) used to be a third leftmost
column but now live in the left app sidebar (`SettingsNavList`); the active
category is shared through the `useSettingsNav` store. Categories: 通用 (General:
通用/AI 模型/联网搜索/通知/快捷键/账户), 研究画布 (Research Canvas: 回复风格), 任务,
聊天 (placeholders). Stateless except for UI-only toggles (password visibility)
and the reply style (read from `useResearchPrefs`); the active pane comes from
`useSettingsNav` and all AI data + callbacks come from `SettingsView`.

## Core exports
- `AiSettingsForm(props)` — the 2-column form, rendered inline on the page
  (wrapped in `.nb-settings-2col`, no modal scrim/close).
- Types: `AiSetupFormValues`, `TestStatus`, `SaveState`, `AiSettingsFormProps`.

## Dependencies
- Upstream: `@/icons/icons`, `@/icons/provider-logos`, `@/lib/ai-providers`,
  `@/lib/useAiSettings` (TestConnectionResult type), `@/store/useResearchPrefs`,
  `@/store/useSettingsNav` (active pane), `@/research/styles`, `./settings-nav`
  (`buildCategories` / `categoryIdForPane` / `NavIcon`), `./ModelCombobox`,
  `./AccountSection`, `./NotificationSettings`, `./ShortcutsSection`.
- Downstream: `SettingsView`.

## Key notes
- Inline auto-save status line lives at the bottom of the **items** column and
  only shows on the server-persisted panes (AI 模型 / 联网搜索); the General and
  回复风格 panes persist to localStorage instantly.
- The provider picker is a chip grid (`.nb-prov-grid`) inside the AI 模型 detail
  pane (it used to be the whole master column).
- Reuses the existing `.nb-ai-*` styles; new `.nb-set-*` / `.nb-prov-*` /
  `.nb-style-*` styles live in app.css.

## Change history

### 2026-06-18 — categories → sidebar; page becomes 2-column
- **Motivation**: the user asked to remove the settings page header, move the
  leftmost categories column into the left app sidebar, and surface a "设置"
  header at the top of that sidebar list.
- **Changes**: extracted the nav model (types, tints, `buildCategories`,
  `NavIcon`, new `categoryIdForPane`) into `./settings-nav` shared with the new
  `sidebar/SettingsNavList`; replaced the local `activePane` `useState` with the
  shared `useSettingsNav` store; deleted the categories column (column 1) from the
  JSX so the page now renders only items + detail; switched the wrapper from
  `.nb-settings-3col.nb-settings-split` to `.nb-settings-2col`. The items/detail
  rendering and the `AiSettingsFormProps` contract are otherwise unchanged.

### 2026-06-18 — add the 快捷键 (Shortcuts) item
- **Motivation**: user asked to display and edit keyboard shortcuts in Settings.
- **Change**: added a `shortcuts` pane under the 通用 category (between 通知 and
  账户) rendering `<ShortcutsSection />`; it persists to localStorage like the
  General / 回复风格 panes, so it is excluded from the auto-save hint.

### 2026-06-18 — Rebuild into a 3-column categories → items → detail layout
- **Motivation**: the settings page needed first-class categories (研究画布,
  任务, 聊天) alongside 通用, and a home for the new AI reply-style picker.
- **Changes**: replaced the 2-column master-detail with `.nb-settings-3col`
  (categories | items | detail) driven by a `buildCategories()` nav tree and a
  single `activePane` leaf state; split the detail into per-pane components
  (`AiModelPane`, `WebSearchPane`, `ResearchStylePane`, `ComingSoonPane`,
  `GeneralPane`); moved the 13-provider list into `AiModelPane` as a chip grid
  (`.nb-prov-grid`); extracted `ModelCombobox` into its own file; added the
  研究画布 → 回复风格 pane reading/writing `useResearchPrefs`. The page heading,
  auto-save effect and props contract (`AiSettingsFormProps`) are unchanged, so
  `SettingsView` needed no edits. The old `LanguagePane` is now `GeneralPane`.

### 2026-06-16 — model picker → single editable combobox
- **Motivation**: the model field rendered two stacked controls — a native
  `<select>` of fetched ids *and* a separate free-text `<input>` — both bound to
  the same value. Users couldn't tell which was authoritative and it wasted
  vertical space (reported as a confusing interaction).
- **Changes**: removed the `<select>` + `<input>` pair (and the now-unused
  `selectValue` helper); added a `ModelCombobox` sub-component — one text field
  the user can type a custom id into, plus a chevron that opens a filterable
  popover of the fetched ids. The text field doubles as the type-ahead filter, so
  there is a single source of truth for the value. Keyboard nav (↑/↓/Enter/Esc),
  selected-row check mark, auto-scroll-into-view, outside-click close, and
  empty/loading/no-match popover states are handled locally; the chevron + popover
  only render when `info.canListModels`. Styles live in `app.css` as `.nb-modelcb-*`
  (reusing the `CompareModelSelect` visual language). Added `useEffect`/`useRef`
  imports.

### 2026-06-13 — created (adapted from onboarding/AiProviderSetupForm)
- **Motivation**: settings became a page; the form needed to render inline
  rather than inside a modal.
- **Goal**: keep the master-detail UI identical while dropping the modal scrim,
  the floating close button and the `onClose` prop.
- **Key decision**: return the `.nb-ai-split` content directly so it can be
  placed under the page heading; renamed to `AiSettingsForm` and moved into the
  `settings/` folder alongside its container.

### 2026-06-15 — add Account entry to master list
- **Motivation**: account management (profile, security, sessions, data export/delete)
  needs a home in the settings master-detail panel.
- **Changes**: added `"account"` to the `activePane` union; added an "Account" master-list
  row (shown only when signed in) under the "偏好设置" group; when `account` is active the
  detail pane renders `<AccountSection>` with the current user; added `useAuthUser` import
  and `authUser` local variable; the detail pane gets the `nb-ai-detail--account` modifier
  class for scrollable layout.

### 2026-06-15 — i18n Phase 1: Language pane + useT wiring
- **Motivation**: the settings page is a high-visibility surface; the language
  switcher lives here so users can always reach it even before other surfaces are
  migrated. The page title and other settings strings are also wired.
- **Changes**: imports `useLocale`, `useT` from `@/lib/i18n/LocaleContext` and
  `SUPPORTED_LOCALES`, `Locale` from `@/lib/i18n`; adds `"language"` to the
  `activePane` union; adds a "Language / 语言" master-list row under "偏好设置";
  adds `LanguagePane` component (renders one `nb-ai-prow` button per supported
  locale, active locale gets ✓ tag); `LanguagePane` calls `onSetLocale` which
  updates the LocaleContext and persists to localStorage — live update, no reload.

### 2026-06-15 — add Notifications entry to master list
- **Motivation**: wire in the new `NotificationSettings` component.
- **Changes**: added `"notifications"` to the `activePane` union; added a
  "通知" (Notifications) master-list row under a new "偏好设置" group; when
  `notifications` is active the detail pane renders `<NotificationSettings>`
  instead of the AI/websearch panels; added `userSignedIn` prop to
  `AiSettingsFormProps` to gate the notification settings query.
