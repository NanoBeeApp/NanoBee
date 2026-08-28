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
  list; recent projects call `loadProject`. Deep-link / list failures from the
  store (`error`, `loadingProject`) render in place above the composer so a
  missing `?project=` is explained instead of looking like an empty welcome.
  The error line also tells the user they can start a new research below.
- The topic input submits on Enter through the shared `useImeComposition` guard,
  so an Enter that confirms a Chinese / kana / hangul candidate does not start a
  research run prematurely.

## Change history

### 2026-08-28 — Point a missing deep link at starting a new research
- **Motivation**: `rp_mI6BYoThLD` has no D1 row and no browser cache, so the
  page cannot reopen that canvas; a bare 404 line still felt like "won't open".
- **Goal**: keep the in-place error and make the next action obvious.
- **Key decision**: append "可以在下方重新开始一项研究。" to the error copy;
  do not invent a fake project for an id we never persisted.

### 2026-08-28 — Show deep-link load status / error in place
- **Motivation**: `loadProject` failures used to leave this screen looking idle.
- **Goal**: surface `loadingProject` and `error` from the store in the welcome
  body (not a floating pill).
- **Key decision**: two short lines above the composer, with `research-load-status`
  / `research-load-error` test ids.

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
