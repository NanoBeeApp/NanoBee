// English locale — partial translation of the zh baseline.
// Only the surfaces wired in Phase 1 (app shell, empty state, settings language
// control) are fully translated. Everything else is left absent so the fallback
// chain (en value → zh value → key path) keeps the UI from showing raw key strings.
//
// Migration note: as you wire a new surface, add its keys here.

import type { ZhDict } from './zh';

// DeepPartial allows partial en translations — any missing key falls back to
// the zh value (then the key path) at runtime in t().
// String leaves are widened to `string` so English translations don't have to
// match the exact Chinese literal types produced by `zh as const`.
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : string;
};

export const en: DeepPartial<ZhDict> = {
  // ── App shell / Sidebar navigation ──────────────────────────────────────
  nav: {
    chat: 'Chat',
    today: "Today's Inbox",
    tasks: 'Tasks',
    artifacts: 'Artifacts',
    research: 'Research',
    settings: 'Settings',
    collapseSidebar: 'Collapse sidebar',
    chatHistory: 'Chat history',
    topicGroups: 'Topic groups',
  },

  // ── Sidebar new-action button ────────────────────────────────────────────
  newAction: {
    chat: 'New Chat',
    task: 'New Task',
    artifact: 'New Artifact',
    research: 'New Research',
  },

  // ── Brand tagline ────────────────────────────────────────────────────────
  brand: {
    tagline: 'Your proactive AI assistant',
  },

  // ── Chat empty state ─────────────────────────────────────────────────────
  emptyState: {
    heading: "What's on your mind?",
    sub: 'Or let NanoBee watch something for you and notify you when it matters.',
    starters: {
      gold: 'Track gold price',
      hn: 'Daily HN digest',
      keyword: 'Keyword monitor',
      reminder: 'Daily reminder',
    },
  },

  // ── Settings page ────────────────────────────────────────────────────────
  settings: {
    pageTitle: 'Settings',
    pageSubtitle: 'Configure AI model and web-search provider · Auto-saves on change',
    loading: 'Loading settings…',
    signedOut: 'Sign in to configure your own AI model and web-search provider.',
    loginButton: 'Log in / Sign up',
    // Language switcher
    language: {
      sectionLabel: 'Language / 语言',
      zh: '中文',
      en: 'English',
    },
  },
};
