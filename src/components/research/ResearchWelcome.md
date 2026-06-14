# components/research/ResearchWelcome.tsx

## File responsibility
Research entry screen: name a direction → AI builds the outline; also lists
saved projects to resume.

## Core exports / API
- `ResearchWelcome()`.

## Dependencies
- Upstream: `store/useResearchStore.ts`, `icons/icons.tsx`,
  `lib/useImeComposition.ts`.
- Downstream: `components/research/ResearchView.tsx`.

## Key implementation notes
- Input + example chips call `startResearch`. On mount it loads the project
  list; recent projects call `loadProject`.
- The topic input submits on Enter through the shared `useImeComposition` guard,
  so an Enter that confirms a Chinese / kana / hangul candidate does not start a
  research run prematurely.

## Change history

### 2026-06-14 — IME-safe Enter on the topic input
- **Motivation**: the topic `<input>` submitted on any Enter, so confirming a
  pinyin candidate immediately kicked off a research run with the half-typed
  text.
- **Fix**: gate submission on the shared `useImeComposition` `isSubmitEnter`
  test and spread `compositionProps` onto the input.

### 2026-06-13 — Created
- **Motivation**: Replace Curve's mock-seeded welcome with a real entry point
  that kicks off AI outline generation and resumes saved projects.
- **Goal**: A focused first screen for the welcome phase.
- **Key decision**: Surface saved projects here (no separate library page) for
  the MVP.
