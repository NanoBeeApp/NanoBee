# ArtifactGallery

The body under the Artifacts tab bar. Picks what to show for the active tab:
- `mine` — your data views as a card grid; empty → an empty state + a "为你推荐"
  strip of one-click templates.
- `favorites` — your favorited views; empty → an empty state + the same strip.
- `<category>` — that category's recommended one-click templates.

Always a card grid (the design has no gallery view switch). Owns the store wiring
(open / favorite / delete / generate) while the card components stay pure.

## Change history & motivation
- 2026-06-17 — Rewritten to the design's `af-vgrid` / `af-reco-grid`. Replaced the
  list/table/card render branches + `ArtifactsViewSwitch` (removed) with a single
  card grid; cards are now `ArtifactViewCard` / `ArtifactRecoCard`.
