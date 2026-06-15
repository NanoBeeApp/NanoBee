# src/store/useCompareStore.ts

## Responsibility
State + actions for the multi-model compare page: the columns (each a
provider+model), the shared prompt, the provider catalog and the user's
configured provider keys, and the concurrent per-column SSE streaming.

## Core exports
- `useCompareStore` (zustand): `columns`, `lastPrompt`, `syncScroll`, `providers`,
  `configured`, `signedIn`, `providersLoaded`.
- Actions: `loadProviders`, `setColumns` (URL→store), `addColumn`, `removeColumn`,
  `setColumnModel`, `setSyncScroll`, `run`, `regenerateAll`, `retryColumn`,
  `canRun`, `saveProviderKey`, `deleteProviderKey`.
- Types: `CompareColumn`, `ColumnStatus`, `ProviderKeyStatus`, `CompareProviderInfo`.
- `isProviderId(id)` guard.

## Relationships
- Upstream: `lib/ai-providers`, `lib/compare-models`, `lib/api-client`, `data/ids`.
- Backend: `POST /api/compare/stream` (raw `fetch`, SSE), `GET /api/compare/providers`
  + `PUT/DELETE /api/compare/keys` (typed RPC client).
- Downstream: `CompareView`, `CompareColumn`, `CompareModelSelect`, `CompareComposer`,
  `ProviderKeyDialog`, `useCompareUrlSync`.

## Key implementation notes
- One stream per column fired concurrently in `run()` / `regenerateAll()`; each
  column has its own `AbortController` (module map) so a re-run/model-change/remove
  aborts the prior in-flight stream.
- Token updates are coalesced to one render-per-frame per column via a module-level
  buffer + a queued `requestAnimationFrame` flush (tokens arrive faster than paint).
- `canRun` decides if a provider can run now: OpenRouter always (built-in key),
  others only when a key is on file. Columns whose provider can't run surface a
  "needs key" state.
- `setColumns` is a no-op when the incoming model sequence equals the current one,
  so URL→store sync doesn't wipe results mid-run.

## Change history
### 2026-06-15 — Created
- Reason: the compare page needs independent, concurrent per-model streaming plus
  multi-provider key state, separate from the main chat store.
- Goal: a self-contained store mirroring the chat SSE pattern, one stream/column.
- Key decision: per-column abort controllers + rAF-coalesced flushes so N live
  typewriters stay smooth and re-runs cancel cleanly.

### 2026-06-15 — Add syncScroll state + setSyncScroll action (wiring fix)
- `syncScroll: boolean` and `setSyncScroll(on: boolean)` were referenced by
  `useCompareUrlSync.ts` but missing from the interface and the store's initial
  state. Added both to the `CompareState` interface and to the `create()` body.
