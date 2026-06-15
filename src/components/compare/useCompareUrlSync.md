# src/components/compare/useCompareUrlSync.ts

## Responsibility
Two-way sync between the `/compare` URL search params and `useCompareStore`, so
the selected models and the sync-scroll toggle are shareable/bookmarkable and an
initial `?q=` (from the chat entry) runs once.

## Core export
- `useCompareUrlSync(): void` — call once inside the `/compare` route subtree
  (from `CompareView`).

## URL params
- `models` — comma-joined `provider:model` tokens (the column set).
- `sync` — `"1"` when sync-scroll is on.
- `q` — initial prompt to auto-run once (kept in the URL for shareable replay).

## Relationships
- Upstream: `@tanstack/react-router` (`getRouteApi("/_app/compare").useSearch`,
  `useNavigate`), `useCompareStore`, `lib/compare-models` (`modelKey`,
  `parseModelKey`), `lib/ai-providers` (`AiProviderId`).
- Validated by the route's `validateSearch` in `routes/_app/compare.tsx`.

## Notes
- Mirrors `useResearchUrlSync`: each direction acts only on a real difference, so
  they converge instead of looping.
- `setColumns` ignores an identical model set, so URL→store won't wipe results
  mid-run; store→URL uses `replace` to avoid history spam while editing columns.

## Change history
### 2026-06-15 — Created
- Reason: URL-as-state rule — the compare model set + sync toggle must survive
  refresh and be shareable; the chat entry hands in an initial prompt via `?q=`.
- Goal: convergent two-way sync + one-shot initial-prompt run.
