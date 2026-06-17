# AFCards

The generative-UI card templates for a data view's item stream, plus the uniform
list row and loading skeleton, plus the shared `AFSummary` / `AFSourceBadge`.
Each data SHAPE gets a deliberately different card; the list view is one compact
row across all shapes.

Templates read a real `DataViewItem` with safe fallbacks (backend items are
generic title + summary + meta), so the Hacker-News (`af-hn`) and News (`af-news`)
templates carry the page. `AFCard` is the dispatcher keyed on the template kind.

## Change history & motivation
- 2026-06-17 — Created for the design rebuild, replacing the single adaptive
  `DataViewCard`. Reads from `DataViewItem`/`afMeta` rather than the design's mock
  item shapes.
