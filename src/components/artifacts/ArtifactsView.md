# ArtifactsView

The Artifacts (数据视图) page, rebuilt to the NanoBee design. Orchestrator only:
it owns the URL↔store sync (active tab + open artifact + the detail's card/list
view mode via `useArtifactsUrlSync`) and switches between the tabbed **card
gallery** and a single artifact's **detail**.

- gallery: `ArtifactsTabs` + `ArtifactGallery`, with a "数据视图" title and a
  "新建数据视图 ⌘N" button (`store.newArtifact`).
- detail: `DataViewDetail` for data views, `ArtifactDetail` for legacy word decks.
- a creating banner shows while `artifactGenerating`.

Data views are created in chat (the create_data_view agent tool) or by clicking a
recommended template; this page kicks off generation but never owns it.

## Change history & motivation
- 2026-06-17 — Rewritten to the design's `af-` surface (white Stripe/Ledger
  theme). Dropped the gallery list/table/card view switch — the gallery is always
  a card grid; `vm` now only drives the detail's card/list item view.
