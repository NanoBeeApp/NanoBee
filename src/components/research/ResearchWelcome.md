# components/research/ResearchWelcome.tsx

## File responsibility
Research entry screen: name a direction → AI builds the outline; also lists
saved projects to resume.

## Core exports / API
- `ResearchWelcome()`.

## Dependencies
- Upstream: `store/useResearchStore.ts`, `icons/icons.tsx`.
- Downstream: `components/research/ResearchView.tsx`.

## Key implementation notes
- Input + example chips call `startResearch`. On mount it loads the project
  list; recent projects call `loadProject`.

## Change history

### 2026-06-13 — Created
- **Motivation**: Replace Curve's mock-seeded welcome with a real entry point
  that kicks off AI outline generation and resumes saved projects.
- **Goal**: A focused first screen for the welcome phase.
- **Key decision**: Surface saved projects here (no separate library page) for
  the MVP.
