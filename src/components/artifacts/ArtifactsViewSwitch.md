# components/artifacts/ArtifactsViewSwitch.tsx

## Responsibility
Icon segmented control for switching between "list / table / card" views in the Artifacts gallery. Pure rendering — active mode and the change callback come from the page (`useArtifactsUrlSync`; view mode is stored in the URL).

## Core exports / API
- `ArtifactsViewSwitch({ value, onChange })`

## Dependencies
- Upstream: `routes/_app/artifacts.tsx` (`ArtifactsViewMode`), `icons/icons.tsx`, `types.ts` (`IconName`)
- Downstream: `ArtifactGallery.tsx` (rendered in the top toolbar row)

## Key implementation notes
- Three modes: `list` (`Icons.list`) / `table` (`Icons.table`) / `card` (`Icons.grid`)
- Pure rendering; `aria-pressed`; `data-testid=artifacts-view-{id}`

## Change history

### 2026-06-15 — Created
- **Motivation**: users asked for view switching in artifacts (list / table / card) with a non-card default
- **Goal**: lightweight segmented control for switching views
- **Key decisions**: pure rendering, state driven by URL; added the `table` icon to `icons`
