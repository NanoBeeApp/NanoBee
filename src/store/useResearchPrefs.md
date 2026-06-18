# store/useResearchPrefs.ts

## File responsibility
A small zustand store holding browser-local Research Canvas preferences that
influence generation. Currently the single "AI reply style" preference
(`科普 / 专业 / 简练`), persisted to localStorage.

## Core exports / API
- `useResearchPrefs` — zustand store with `{ replyStyle, setReplyStyle }`.
  - `replyStyle: ResearchReplyStyle` — read by `useResearchStore` at request time.
  - `setReplyStyle(style)` — normalizes, persists to localStorage, updates state.

## Dependencies
- Upstream: `research/styles.ts` (type, default, normalizer).
- Downstream: `store/useResearchStore.ts` (reads it via `getState()` when
  building generate requests), `components/settings/AiSettingsForm.tsx` (the
  style picker reads/sets it).

## Key implementation notes
- Kept separate from `useResearchStore` so the (large) per-project canvas state
  isn't coupled to a global preference, and so the prefs survive a project
  change / `newResearch()` reset.
- localStorage I/O is SSR-guarded and try/catch-wrapped (matches
  `components/research/reading-highlights.ts`). The store reads once on creation;
  later writes go through `setReplyStyle`.

## Change history

### 2026-06-18 — Created
- **Motivation**: persist the user's chosen AI reply style and expose it to the
  research store + the settings picker.
- **Key decision**: browser-local (localStorage) like the locale preference,
  not a server/D1 field — works signed-out and avoids a migration.
