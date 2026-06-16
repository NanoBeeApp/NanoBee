// React context + provider for the active locale.
// Mount <LocaleProvider> once near the root; consume via useLocale() / useT().
//
// Design decisions:
//   - Context value is { locale, setLocale } — setLocale also persists to
//     localStorage so the choice survives reload.
//   - The initial locale is read from localStorage (readPersistedLocale), which
//     defaults to "zh" when nothing is stored.
//   - useT() returns a bound t(key) function that always uses the current locale,
//     so consumers re-render automatically when the locale changes.

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  translate,
  readPersistedLocale,
  persistLocale,
  DEFAULT_LOCALE,
  type I18nKey,
  type Locale,
} from './index';

// ── Context types ─────────────────────────────────────────────────────────────

interface LocaleContextValue {
  /** The currently active locale code ("zh" | "en"). */
  locale: Locale;
  /** Update the active locale and persist it to localStorage. */
  setLocale: (locale: Locale) => void;
  /** Translate a key for the current locale (same as useT() but inlined). */
  t: (key: I18nKey) => string;
}

// ── Context ───────────────────────────────────────────────────────────────────

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: (key) => key,
});

// ── Provider ──────────────────────────────────────────────────────────────────

interface LocaleProviderProps {
  children: ReactNode;
  /** Override the initial locale (e.g. from a user pref fetched from the server).
   *  When absent, falls back to localStorage → DEFAULT_LOCALE ("zh"). */
  initialLocale?: Locale;
}

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(
    () => initialLocale ?? readPersistedLocale(),
  );

  const setLocale = useCallback((next: Locale) => {
    persistLocale(next);
    setLocaleState(next);
  }, []);

  const t = useCallback((key: I18nKey): string => translate(locale, key), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Access the active locale and the setLocale updater. */
export function useLocale(): Pick<LocaleContextValue, 'locale' | 'setLocale'> {
  const { locale, setLocale } = useContext(LocaleContext);
  return { locale, setLocale };
}

/**
 * Returns a t(key) function bound to the current locale.
 * Re-renders automatically when the locale changes.
 *
 * Usage:
 *   const { t } = useT();
 *   return <span>{t('nav.chat')}</span>;
 */
export function useT(): { t: (key: I18nKey) => string } {
  const { t } = useContext(LocaleContext);
  return { t };
}
