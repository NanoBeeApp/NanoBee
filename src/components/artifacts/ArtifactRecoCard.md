# ArtifactRecoCard

A one-click recommended-template card (shown under the category tabs and below an
empty personal tab). Clicking it runs the template's canned prompt through the
chat agent's create_data_view tool, producing a real data view. Pure render; the
run + disabled state are owned by the gallery.

## Change history & motivation
- 2026-06-17 — Created for the design rebuild, replacing the old `RecommendedCard`
  / `RecommendedRow`. Uses the design's `af-rcard` markup with the hover-fill add
  button.
