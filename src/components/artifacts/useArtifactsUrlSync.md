# components/artifacts/useArtifactsUrlSync.ts

## Responsibility
Bridge hook between the Artifacts page URL search params (`?tab=&artifact=&vm=`) and the store. Ensures that tab, open deck, and view mode are consistent and bookmarkable/shareable after a page refresh, deep-link navigation, or browser back/forward.

## Core exports / API
- `DEFAULT_ARTIFACTS_TAB` ('mine'), `DEFAULT_ARTIFACTS_VM` ('list')
- `useArtifactsUrlSync()`: returns `{ tab, setTab, viewMode, setViewMode }`

## Dependencies
- Upstream: `@tanstack/react-router` (getRouteApi/useNavigate), `store/useAppStore.ts` (selectedArtifactId/selectArtifact)
- Downstream: `ArtifactsView.tsx`

## Key implementation notes
- `tab` is stored in the URL only (page-local); `setTab` writes the new tab and drops `artifact` (switching tabs closes the detail panel); the default tab omits the param to keep the URL clean.
- `artifact` ↔ `store.selectedArtifactId` are kept in two-way sync. **Each side tracks the previous value with a ref** to distinguish a genuine change from the initial hydration, and only acts on a real difference — converges without looping or clearing each other:
  - URL → store: if the URL has `artifact`, adopt it; if the param goes from present to absent (browser back / tab switch), clear the store; an initially empty URL leaves the store untouched (avoids clearing a selection already set by `openArtifacts(id)` from a chat reference).
  - store → URL: a non-empty selection is written to the URL; only a non-null → null transition (a genuine close) clears the param; initial null + deep-link is left for the URL→store direction to handle.
- Supports page refresh / deep links / browser back-forward (URL-as-state principle).
- Modeled on the established pattern in `research/useResearchUrlSync`.

## Change history

### 2026-06-15 — add vm view mode
- **Motivation**: the list/table/card view-toggle state affects visible content and therefore must live in the URL.
- **Goal**: expose `viewMode` + `setViewMode` via `?vm=`; omit the param when the value is the default `list`.
- **Key decisions**: `vm` is URL-only (page-local), like `tab`; use `mkSearch` to build the search string consistently and omit defaults; `setTab`, opening/closing the detail panel, and `setViewMode` all preserve the other two params (no accidental drops).

### 2026-06-15 — created
- **Motivation**: the active tab and the open deck are view state that affects visible content; per the URL-as-state principle they must be encoded in the URL.
- **Goal**: sync `tab` + selected deck into the URL and keep them in sync with the store.
- **Key decisions**: `tab` is URL-only; `artifact` is two-way; switching tabs drops `artifact` to close the detail panel.
