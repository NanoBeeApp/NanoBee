# components/artifacts/RecommendedCard.tsx

## Responsibility
Pure rendering of a single "recommended template" card: used in category tabs and in the "Recommended for you" empty state. Clicking runs the template's preset prompt to generate a deck in one click.

## Core exports / API
- `RecommendedCard({ template, icon, onRun, disabled })`

## Dependencies
- Upstream: `artifacts/recommended.ts` (`RecommendedTemplate`), `types.ts` (`IconName`), `icons/icons.tsx`
- Downstream: `ArtifactGallery.tsx`

## Key implementation notes
- Pure rendering; `onRun(prompt)` is wired by the gallery to `store.runArtifactShortcut`
- The `icon` is resolved from the category icon by the gallery and passed in — the component itself is decoupled from categories
- `disabled` during generation to prevent re-entrancy
- `data-testid`: `recommended-card-{id}`

## Change history

### 2026-06-15 — Created
- **Motivation**: category tabs and the empty state needed a one-click generation entry point
- **Goal**: display template title / subtitle / badge + one-click generation
- **Key decisions**: reuses the existing `runArtifactShortcut` pipeline; clicking generates a real artifact
