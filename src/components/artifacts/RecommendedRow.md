# components/artifacts/RecommendedRow.tsx

## Responsibility
A single recommended-template row in the list view. Follows the same flat-row convention as `ArtifactRow`: icon + title (+ optional badge) + subtitle + a "Generate" action at the tail. Clicking the entire row runs the template's preset prompt to generate in one click. Pure rendering.

## Core exports / API
- `RecommendedRow({ template, icon, onRun, disabled })`

## Dependencies
- Upstream: `types.ts` (`IconName`), `artifacts/recommended.ts` (`RecommendedTemplate`), `icons/icons.tsx`
- Downstream: `ArtifactGallery.tsx` (list view: category tabs + empty-state recommendations)

## Key implementation notes
- The entire row is a `button`; `disabled` during generation
- Badge reuses `.nb-rec-card-badge`
- `data-testid=recommended-row-{id}`

## Change history

### 2026-06-15 — Created
- **Motivation**: the recommendations section was also switched from heavy cards to lightweight flat rows (default list view)
- **Goal**: recommendation row that is visually consistent with owned rows
- **Key decisions**: reuses the badge style; entire row is clickable to generate
