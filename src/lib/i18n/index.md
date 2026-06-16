# src/lib/i18n/index.ts

## Responsibility

Lightweight in-house i18n engine with zero external dependencies.

Exports:
- `translate(locale, key)` — core translation function; dot-separated key → string.
- `readPersistedLocale()` / `persistLocale(locale)` — localStorage bridge.
- `I18nKey` — compile-time union of all wired key paths (derived from `ZhDict`).
- `Locale`, `SUPPORTED_LOCALES`, `DEFAULT_LOCALE` — type/constant exports.
- Re-exports `zh` and `en` locale objects for callers that need raw access.

### Fallback chain
1. Value in the active locale dictionary.
2. Value in the zh baseline (so partial `en` translations never break).
3. The key path string itself (last resort — UI never goes blank).

### Key format
Dot-separated path matching the `ZhDict` tree, e.g. `"nav.chat"` or
`"emptyState.heading"`. The `I18nKey` type gives autocomplete in editors.

## Adding a new locale
1. Create `src/lib/i18n/locales/<code>.ts` implementing `DeepPartial<ZhDict>`.
2. Import it here, add `<code>` to `SUPPORTED_LOCALES`, and register it in `LOCALES`.
3. No React changes needed — `LocaleContext` reads `SUPPORTED_LOCALES` dynamically.

## Migrating remaining strings (migration path)

**Phase 1 (done — this commit):** i18n foundation wired on the bounded proof surfaces:
- Sidebar navigation labels (7 tiles + mode switch + collapse button).
- Sidebar new-action button labels.
- Brand tagline.
- Chat empty state (heading, subtitle, 4 starter chip labels).
- Settings page heading/subtitle, loading/signed-out states, login button.
- Settings language switcher (new UI element added in this phase).

**Phase 2 (future):** Migrate the next surface by following this checklist:
1. Add the new keys to `src/lib/i18n/locales/zh.ts` under a logical group.
2. Add English translations to `src/lib/i18n/locales/en.ts`.
3. Import `useT` in the target component; replace hardcoded strings with `t('key')`.
4. Update this file's "wired surfaces" list.

**Remaining un-wired surfaces (not in scope for Phase 1):**
- Toast messages (in `useAppStore.ts`).
- `NEW_ACTION` / `VIEW_CONTEXT` labels (in `useAppStore.ts`).
- `AiSettingsForm` provider/model/websearch field labels and hint text.
- `TasksView`, `TodayView`, `ArtifactsView`, `ResearchView` body copy.
- `NotificationSettings`, `AccountSection` UI text.
- `ChatView`, `Composer`, `MessageView` UI copy.
- Login/auth screens.
- Onboarding overlay.
- Error messages and toast strings.

Each of those is a self-contained migration: add keys → translate → wire with `useT`.
The fallback chain ensures partially-migrated surfaces never break.

## Change history

- 2026-06-15 — Created. Phase 1 i18n foundation: core engine, zh + en locales,
  LocaleContext, useLocale/useT hooks, Sidebar + EmptyState + Settings wired.
