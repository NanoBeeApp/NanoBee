# DataViewDetail

The detail surface for one data view, rebuilt to the design: header (back +
source icon + title + source/filter + favorite/refresh/delete), a derived
"概览" block, a non-blocking pipeline stepper while the async fetch runs, a count
+ card/list toolbar, and the item stream rendered with the generative card
templates (`AFCards`) or a uniform list.

## Wiring
- Items come from `GET /api/artifacts/:id/items`; while the pipeline runs it polls
  `loadArtifacts` every 2s and re-fetches items as they land (skeleton → items).
- The overview text + pipeline stage are **derived** from the real
  `pipelineStatus` + items (the backend stores no AI overview), so the surface
  stays honest while matching the design.
- Card vs list is the URL `vm` so it survives a refresh.

## Change history & motivation
- 2026-06-17 — Rewritten to the design's `af-detail`. Replaced the old `nb-dv-`
  header + four-tab switch + `PipelineStatusBar` / `DataViewListPane` /
  `DataViewCard` with the design's overview + pipeline stepper + generative card
  templates and a card/list toggle.
