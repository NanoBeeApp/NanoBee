// Keyboard-shortcut bindings — a tiny zustand store for the user's (possibly
// customized) single-key shortcuts, persisted to localStorage so they survive
// reload and work signed-out. Mirrors how `useResearchPrefs` / the locale
// preference are stored client-side rather than in D1 — lighter, no migration.
//
// The static definitions, defaults and matching helpers live in
// `lib/shortcuts.ts`; this store only holds the live `bindings` map and the
// mutators. The global handler (routes/_app.tsx) reads bindings via getState()
// at keypress time, and Settings → Shortcuts reads/writes them reactively.

import { create } from "zustand";
import {
  DEFAULT_BINDINGS,
  normalizeKey,
  SHORTCUT_DEFS,
  type ShortcutId,
} from "../lib/shortcuts";

const STORAGE_KEY = "nanobee.shortcuts.v1";

type Bindings = Record<ShortcutId, string>;

/** Read persisted bindings, falling back to defaults for any missing/invalid id. */
function readPersisted(): Bindings {
  const bindings: Bindings = { ...DEFAULT_BINDINGS };
  if (typeof window === "undefined") return bindings;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return bindings;
    const parsed = JSON.parse(raw) as Partial<Record<ShortcutId, string>>;
    for (const def of SHORTCUT_DEFS) {
      const key = normalizeKey(parsed?.[def.id] ?? "");
      if (key) bindings[def.id] = key;
    }
    return bindings;
  } catch {
    return bindings;
  }
}

function writePersisted(bindings: Bindings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // localStorage full / disabled → keep the in-memory value, give up silently.
  }
}

interface ShortcutsState {
  /** Live key per configurable shortcut (uppercase single char). */
  bindings: Bindings;
  /**
   * Rebind one shortcut. The new key is normalized; an invalid key is ignored.
   * If the key already belongs to another shortcut, that other one is swapped to
   * the displaced shortcut's previous key so two actions never share a key.
   */
  setBinding: (id: ShortcutId, key: string) => void;
  /** Restore one shortcut to its default key. */
  resetBinding: (id: ShortcutId) => void;
  /** Restore every shortcut to its default key. */
  resetAll: () => void;
}

export const useShortcuts = create<ShortcutsState>((set, get) => ({
  bindings: readPersisted(),

  setBinding: (id, rawKey) => {
    const key = normalizeKey(rawKey);
    if (!key) return;
    const current = get().bindings;
    if (current[id] === key) return;

    const next: Bindings = { ...current, [id]: key };
    // Resolve collisions by swapping: if another shortcut already uses this key,
    // give it the key we're vacating, so every action keeps a distinct binding.
    const clashId = (Object.keys(current) as ShortcutId[]).find(
      (other) => other !== id && current[other] === key,
    );
    if (clashId) next[clashId] = current[id];

    writePersisted(next);
    set({ bindings: next });
  },

  resetBinding: (id) => {
    const next: Bindings = { ...get().bindings, [id]: DEFAULT_BINDINGS[id] };
    writePersisted(next);
    set({ bindings: next });
  },

  resetAll: () => {
    const next: Bindings = { ...DEFAULT_BINDINGS };
    writePersisted(next);
    set({ bindings: next });
  },
}));
