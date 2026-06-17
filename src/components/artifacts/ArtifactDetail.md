# ArtifactDetail

Detail surface for a **legacy word-deck** artifact (English vocabulary): the deck
title/subtitle, favorite + delete actions, and the `CardDeckRenderer`. Kept so
old decks still open. Data views are the core path and are routed straight to
`DataViewDetail` by `ArtifactsView`; this component only handles the `word` kind.

## Change history & motivation
- 2026-06-17 — Narrowed to `WordDeckArtifact` only. The `data_view` branch (which
  forwarded to `DataViewDetail`) was removed because `ArtifactsView` now routes
  data views directly with the `vm`/`setVm` props the rebuilt detail needs.
