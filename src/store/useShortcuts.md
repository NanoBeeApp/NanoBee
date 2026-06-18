# store/useShortcuts.ts

## File responsibility
A small zustand store holding the user's live keyboard-shortcut key bindings
(toggle left / right sidebar), persisted to localStorage. The static definitions
and helpers live in `lib/shortcuts.ts`; this store owns only the mutable map and
its mutators.

## Core exports / API
- `useShortcuts` — zustand store with `{ bindings, setBinding, resetBinding, resetAll }`.
  - `bindings: Record<ShortcutId, string>` — read by the global handler via
    `getState()` and by the settings UI reactively.
  - `setBinding(id, key)` — normalizes; ignores invalid keys; on collision swaps
    the clashing shortcut to the displaced key so two actions never share one key.
  - `resetBinding(id)` / `resetAll()` — restore default(s).

## Dependencies
- Upstream: `lib/shortcuts.ts` (ids, defaults, `normalizeKey`).
- Downstream: `routes/_app.tsx` (global keydown handler reads `bindings`),
  `components/settings/ShortcutsSection.tsx` (rebind UI).

## Key implementation notes
- localStorage I/O is SSR-guarded + try/catch-wrapped (matches `useResearchPrefs`).
  `readPersisted` merges over defaults so a partial/old payload still yields a
  complete, valid map.
- Collision handling keeps bindings a bijection over the small action set — a
  deliberate choice so rebinding can't silently make a key ambiguous.

## Change history

### 2026-06-18 — Created
- **Motivation**: persist the configurable S/D sidebar shortcuts and expose them
  to the global handler + the settings rebind panel.
- **Key decision**: browser-local (localStorage) like the locale / research
  prefs — works signed-out, no migration; swap-on-collision over reject-on-collision
  for a friendlier rebind.
