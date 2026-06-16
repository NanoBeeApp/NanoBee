// Lightweight in-house i18n layer — no external dependencies.
//
// Architecture:
//   - Two locales: "zh" (default, complete) and "en" (partial, phase-1 wired surfaces).
//   - t(key) resolves a dot-separated key path against the active locale, falling
//     back to the zh value, then the key path itself — so the UI never shows blank.
//   - Locale is persisted to localStorage ("nb-locale") so the choice survives reload.
//   - The LocaleProvider/useLocale/useT hooks wire the locale into React via context.
//
// Adding a new locale: add a file in ./locales/, import it here, register it in
// LOCALES, and export its type. No other changes needed.

import { zh, type ZhDict } from './locales/zh';
import { en } from './locales/en';

// ── Supported locales ────────────────────────────────────────────────────────

export type Locale = 'zh' | 'en';

export const SUPPORTED_LOCALES: Locale[] = ['zh', 'en'];
export const DEFAULT_LOCALE: Locale = 'zh';

// Map locale code → dictionary (zh is canonical; en may be partial).
const LOCALES: Record<Locale, unknown> = { zh, en };

// ── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'nb-locale';

/** Read the persisted locale from localStorage; falls back to DEFAULT_LOCALE. */
export function readPersistedLocale(): Locale {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw && SUPPORTED_LOCALES.includes(raw as Locale)) return raw as Locale;
  } catch {
    // localStorage may be unavailable (SSR, incognito).
  }
  return DEFAULT_LOCALE;
}

/** Persist the chosen locale to localStorage. */
export function persistLocale(locale: Locale): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, locale);
    }
  } catch {
    // Ignore write errors (e.g. storage quota).
  }
}

// ── Translation engine ───────────────────────────────────────────────────────

/**
 * Resolve a dot-separated key path against a dictionary, returning the value
 * at that path or undefined when the path does not exist / is not a string.
 */
function resolve(dict: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let node: unknown = dict;
  for (const part of parts) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/**
 * Translate a dot-separated key for the given locale.
 *
 * Fallback chain:
 *   1. Value in the active locale dictionary.
 *   2. Value in the zh (default) dictionary.
 *   3. The key path itself (last resort — never blank).
 *
 * @param locale - The active locale.
 * @param key    - Dot-separated key path, e.g. "nav.chat" or "emptyState.heading".
 */
export function translate(locale: Locale, key: string): string {
  const dict = LOCALES[locale];
  const value = resolve(dict, key);
  if (value !== undefined) return value;

  // Fallback 1: zh baseline.
  if (locale !== DEFAULT_LOCALE) {
    const fallback = resolve(LOCALES[DEFAULT_LOCALE], key);
    if (fallback !== undefined) return fallback;
  }

  // Fallback 2: key path (so the UI is never blank).
  return key;
}

// ── Type-safe key helper ─────────────────────────────────────────────────────

// Flatten ZhDict into a union of dot-separated key strings so t() gets
// autocomplete and compile-time checks on wired keys.
type DotPaths<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends object
    ? DotPaths<T[K], Prefix extends '' ? string & K : `${Prefix}.${string & K}`>
    : Prefix extends ''
    ? string & K
    : `${Prefix}.${string & K}`;
}[keyof T];

export type I18nKey = DotPaths<ZhDict>;

// Re-export the locales so callers can import just what they need.
export { zh, en };
export type { ZhDict };
