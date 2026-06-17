# useArtifactsUrlSync

Bridge between the Artifacts URL search params (`?tab=&artifact=&vm=`) and the
store, so the active browse tab, the open artifact and the detail's item view
mode survive a refresh and can be bookmarked / navigated with back-forward.

- `tab` and `vm` live only in the URL (page-local).
- `artifact` ↔ `store.selectedArtifactId` both ways, each direction tracking its
  previous value with a ref to distinguish a real change from initial hydration.

## Change history & motivation
- 2026-06-17 — `DEFAULT_ARTIFACTS_VM` changed `list` → `card`: the gallery no
  longer has a view switch, so `vm` only drives the data-view detail's item view,
  where the generative card templates are the better default.
