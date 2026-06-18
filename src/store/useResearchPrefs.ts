// Research Canvas user preferences — a tiny zustand store for browser-local
// choices that influence generation, kept separate from useResearchStore (which
// holds the heavy per-project canvas state).
//
// Currently just the "AI reply style" (科普 / 专业 / 简练): a global preference
// chosen in Settings → Research Canvas, persisted to localStorage so it survives
// reload, and read by useResearchStore at request time (sent with every generate
// call). Mirrors how the locale preference is stored client-side rather than in
// D1 — lighter, works signed-out, and feeds the existing prompt-builder seam.

import { create } from "zustand";
import {
  DEFAULT_RESEARCH_STYLE,
  normalizeReplyStyle,
  type ResearchReplyStyle,
} from "../research/styles";

const STORAGE_KEY = "nanobee.research.prefs.v1";

interface PersistedPrefs {
  replyStyle: ResearchReplyStyle;
}

function readPersisted(): PersistedPrefs {
  if (typeof window === "undefined") return { replyStyle: DEFAULT_RESEARCH_STYLE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { replyStyle: DEFAULT_RESEARCH_STYLE };
    const parsed = JSON.parse(raw) as Partial<PersistedPrefs>;
    return { replyStyle: normalizeReplyStyle(parsed?.replyStyle) };
  } catch {
    return { replyStyle: DEFAULT_RESEARCH_STYLE };
  }
}

function writePersisted(prefs: PersistedPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage full / disabled → keep the in-memory value, give up silently.
  }
}

interface ResearchPrefsState {
  /** The chosen AI reply style applied to outline + article generation. */
  replyStyle: ResearchReplyStyle;
  /** Update the reply style and persist it to localStorage. */
  setReplyStyle: (style: ResearchReplyStyle) => void;
}

export const useResearchPrefs = create<ResearchPrefsState>((set) => ({
  replyStyle: readPersisted().replyStyle,
  setReplyStyle: (style) => {
    const replyStyle = normalizeReplyStyle(style);
    writePersisted({ replyStyle });
    set({ replyStyle });
  },
}));
