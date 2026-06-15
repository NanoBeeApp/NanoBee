# artifacts/format.ts

## Responsibility
Centralizes display formatting for artifacts: card kind labels and meta-info lines (e.g. "Words · 10 cards"). Shared by card, row, and table renderers as well as the sidebar list, eliminating duplicated KIND_LABEL definitions across multiple call sites.

## Core exports / API
- `kindLabel(kind)`: maps a card kind to its display label (falls back to the raw value)
- `artifactMeta(a)`: produces the one-line meta string shown next to a deck title, e.g. "Words · 10 cards"

## Dependencies
- Upstream: `artifacts/types.ts` (Artifact)
- Downstream: `components/artifacts/ArtifactCard`, `ArtifactRow`, `ArtifactGallery` (table)

## Change history

### 2026-06-15 — Created
- **Motivation**: after adding list/table views to the artifacts page, KIND_LABEL was being duplicated across card, row, table, and sidebar renderers
- **Goal**: extract a single canonical kind-label and meta-info formatter
- **Key decisions**: pure functions, platform-agnostic, shared by all views from one place
