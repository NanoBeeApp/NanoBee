# research/snapshot-cache.ts

## Responsibility
Same-browser cache of research project snapshots. D1 remains the cross-device
source of truth; this module is the safety net so `?project=` still opens after
a failed or delayed persist (missing table, network error, refresh while the
outline is still generating).

## Core exports / API
- `isResearchSnapshot(value)` — structural guard.
- `cacheSnapshot(snapshot)` — LRU write to `localStorage`.
- `loadCachedSnapshot(projectId)` — one cached snapshot, or `null`.
- `listCachedProjects()` — metadata for the cache, newest first.
- `mergeProjectLists(server, local)` — union; newer `updatedAt` wins per id.
- `newerSnapshot(preferred, other)` — pick the newer of two snapshots.

## Dependencies
- Upstream: `research/types.ts` (`ResearchSnapshot`, `ResearchProjectMeta`).
- Downstream: `store/useResearchStore.ts`.

## Implementation notes
- Storage key: `nanobee.research.snapshots`. Cap 40 entries (insertion-order
  LRU). Quota failures evict oldest entries rather than throwing into the UI.
- Unavailable storage (SSR, privacy mode) degrades to no-op, same as
  `canvas-viewport.ts`.
- Not a second source of truth: the store always tries D1 first, then this
  cache, and re-POSTs a local-only / newer-local snapshot so D1 catches up.

## Verification
- Start a research, disable the network, refresh `/research?project=<id>`:
  the canvas reopens from the cache.
- With D1 empty and no cache, the welcome screen shows the missing-project
  error and keeps `?project=` in the URL.

## Change history

### 2026-08-28 — Created
- **Motivation**: `rp_mI6BYoThLD` was minted in the URL before D1 had the
  `research_projects` table; persist failed silently and the deep link 404ed
  with no local copy to reopen.
- **Goal**: never depend on a single remote write to reopen a project in the
  same browser.
- **Key decision**: localStorage (not IndexedDB) to match the existing research
  viewport cache; snapshots at current size fit comfortably under the quota.
