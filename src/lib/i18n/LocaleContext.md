# src/lib/i18n/LocaleContext.tsx

## Responsibility

React context, provider, and hooks for the active locale.

Exports:
- `LocaleProvider` — mounts once near the root; reads `initialLocale` prop or
  falls back to `readPersistedLocale()` → `DEFAULT_LOCALE` ("zh").
- `useLocale()` — returns `{ locale, setLocale }`. Use when you need to read or
  change the locale (e.g. the language switcher in Settings).
- `useT()` — returns `{ t }` where `t(key: I18nKey)` translates for the current
  locale. Use in any component that renders translated strings.

### Usage pattern

```tsx
// In __root.tsx (or another near-root component):
import { LocaleProvider } from '@/lib/i18n/LocaleContext';
// Wrap children once:
<LocaleProvider>{children}</LocaleProvider>

// In any component:
import { useT } from '@/lib/i18n/LocaleContext';
const { t } = useT();
return <span>{t('nav.chat')}</span>;

// In the language switcher:
import { useLocale } from '@/lib/i18n/LocaleContext';
const { locale, setLocale } = useLocale();
<button onClick={() => setLocale('en')}>English</button>
```

## Dependencies
- `./index` (translate, readPersistedLocale, persistLocale, types)
- React (createContext, useState, useCallback, useMemo, useContext)

## Change history

- 2026-06-15 — Created. Phase 1 i18n foundation.
