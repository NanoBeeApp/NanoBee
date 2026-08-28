# store/useResearchStore.ts

## File responsibility
Dedicated zustand store for the Research Canvas view: owns the current
project's node map, generation lifecycle, the reading-overlay selection, and
snapshot persistence.

## Core exports / API
- `useResearchStore` with state (`phase`, `projectId`, `nodes`, `order`,
  `activeNodeId`, `generating`, `projects`, `error`, `loadingProject`,
  `projectHighlighted`, `highlightedNodeId`, `traces`) and actions:
  `listProjects`, `startResearch`, `openNode`, `growChild`, `closeReading`,
  `loadProject(id, openNodeId?)` (returns `boolean`), `newResearch`,
  `highlightProject`, `clearProjectHighlight`.

## Dependencies
- Upstream: `lib/api-client.ts` (typed RPC), `data/ids.ts`, `research/types.ts`,
  `research/streaming.ts` (`extractStreamingContent`),
  `store/useResearchPrefs.ts` (reply style sent with each request).
- Downstream: every `components/research/*` component;
  `components/research/useResearchUrlSync.ts` (URL ↔ store bridge).

## Key implementation notes
- Kept separate from `useAppStore` so the large canvas state doesn't bloat the
  main store (App.tsx still drives view switching via `useAppStore.view`).
- `startResearch` generates an outline and flattens the tree into nodes (each
  node keeps its `parentId`/`depth`; the canvas derives the outline structure).
  `openNode` fills a stub node's article on demand. `growChild` creates a child
  optimistically (loading), generates its article, and focuses it. Snapshot
  saves are debounced (800ms).
- Generation goes through `POST /api/research/generate`, which reuses the
  user's chat provider config.
- `loadProject` returns `true` only after the snapshot is in the store. A 404
  keeps the current phase (usually welcome) and sets a user-facing `error`;
  other transport failures do the same with a retry message. `listProjects`
  failures set `error` only when none is already set, so they cannot overwrite
  a more specific deep-link 404.

## Change history

### 2026-08-28 — Surface load/list failures instead of a silent welcome
- **Motivation**: a bookmarked `?project=` that 404s (or a D1/list outage) left
  the welcome screen looking like "no projects", with the failure only in the
  console — the page felt like it "wouldn't open".
- **Goal**: tell the user why the deep link didn't load, and keep the canvas
  banner highlight from firing on a failed load.
- **Key decision**: `loadProject` now returns `boolean`, sets `loadingProject`
  while in flight, and writes a specific 404 / transport `error`. `listProjects`
  only fills `error` when none is already set, so a racing deep-link 404 isn't
  overwritten by the generic list-failure copy.

### 2026-06-18 — Send the user's AI reply style with every generation
- **Motivation**: the new Settings → 研究画布 → 回复风格 choice must apply to all
  research generation (outline + every content call).
- **Key decision**: read `useResearchPrefs.getState().replyStyle` inside the two
  generation helpers (`generate` and `generateContentStream`) and add it to the
  request body — one place each, so all five call sites inherit it without
  threading a param through every action.

### 2026-06-17 — Add `askOnCanvas` for research-aware quick chat
- **Motivation**: On the research canvas the quick chat should feed the canvas:
  a question asked there should become a node at the very TOP of the outline
  (leading both the canvas and the sidebar tree), grounded in what the user is
  currently looking at.
- **Goal**: One action that spawns the node, streams the answer as its article,
  and mirrors the streamed text back to the caller (the popup).
- **Key decision**: Insert the node at `order` index 1 (first child of the root)
  so it tops the outline; only LIGHT it (`highlightedNodeId`), deliberately NOT
  setting `activeNodeId`, so the full reading overlay stays closed — the answer
  already lives in the quick-chat popup and the canvas just scrolls to the lit
  card. Reuses `generateContentStream` (content mode) grounded in the currently
  viewed node (`activeNodeId ?? highlightedNodeId`) captured before the highlight
  moves. `onContent` callback lets `useAppStore.sendQuick` mirror the same answer
  into the popup bubble.

### 2026-06-15 — Fix TS 5.9 `never` narrowing in `generateContentStream`
- **Motivation**: TypeScript 5.9 tightened control-flow analysis for
  closure-mutated `let` variables; `result` (written inside `handleFrame`) was
  narrowed to `never` outside the closure, causing `result?.trace` to error
  with "Property 'trace' does not exist on type 'never'".
- **Fix**: snapshot `result` into `const finalResult = result as
  ResearchGenerationResult | null` immediately before the return, giving
  TypeScript a fresh `const` binding with the explicit declared type rather
  than the narrowed inference.  No runtime behaviour change.

### 2026-06-15 — Capture generation traces for debugging (`traces` map)
- **Motivation**: the canvas/reading overlay need to show how the outline and
  each article were generated; the store has to hold those traces.
- **Goal**: keep an in-session `traces` map and populate it from each generation
  call (outline + per-node content), including on failure.
- **Key decision**: `generate` and `generateContentStream` now return
  `{ result, trace }` (the trace is carried even on failure — non-streamed via
  the 502 body, streamed via the `error` SSE event). Traces are keyed by the id
  of the node they produced (root id → outline trace; concept node id → its
  article trace) and are NOT persisted in the snapshot (they'd bloat it); the
  map is reset on `startResearch` / `loadProject` / `newResearch`. Inline Q&A
  (`askInReading`) ignores its trace — it answers below the article rather than
  growing a node, so there's no node to anchor a "生成过程" entry to.

### 2026-06-14 — Remove focusAndOpenNode / focusNodeId (open immediately)
- **Motivation**: the user wants sidebar rows to open the reading overlay
  instantly; the scroll-then-open delay was unwanted.
- **Goal**: delete the focus-delay path entirely (no dead code).
- **Key decision**: removed `focusNodeId` state, the `focusAndOpenNode` action,
  `FOCUS_OPEN_DELAY_MS`, the module-level `focusTimer`, and all `focusNodeId`
  resets. The sidebar now calls `openNode` directly; the canvas still scrolls to
  the node via its `activeNodeId` effect.

### 2026-06-14 — highlightedNodeId: card highlight survives closing the overlay
- **Motivation**: `closeReading` nulls `activeNodeId`, which also cleared the
  canvas card highlight; the user wants it to persist until a blank-canvas press
  or opening another node.
- **Goal**: a highlight source independent of "which overlay is open".
- **Key decision**: add `highlightedNodeId` (+ `clearNodeHighlight`). It is set
  wherever a node is opened/focused (`openNode`, `growChild`, `focusAndOpenNode`,
  deep-link `loadProject`) but, unlike `activeNodeId`, `closeReading` leaves it
  alone; reset on new-research/new-project. The canvas clears it on a blank press.

### 2026-06-14 — focus→open delay raised 500ms → 1s
- **Motivation**: the user found the half-second pause too short.
- **Key decision**: bump `FOCUS_OPEN_DELAY_MS` to 1000ms; the scroll easing is
  unchanged, so the canvas settles well before the overlay now opens.

### 2026-06-14 — focusAndOpenNode (scroll-then-open for sidebar rows)
- **Motivation**: clicking a sidebar outline row opened the overlay immediately,
  hiding the canvas scroll behind the modal. The user wanted to see the canvas
  move to the node first, then have the overlay appear.
- **Goal**: a store action that scrolls the canvas, pauses, then opens the node.
- **Key decision**: add `focusNodeId` + `focusAndOpenNode(id)`. The action sets
  `focusNodeId` (the canvas eases to that node via an `.is-animating` transition),
  then a module-level timer opens the overlay after `FOCUS_OPEN_DELAY_MS` (1s)
  and clears `focusNodeId`. The timer is cleared/`focusNodeId` reset by
  `startResearch` / `loadProject` / `newResearch` so a pending open can't fire
  into a different project.

### 2026-06-14 — projectHighlighted flag for the canvas selection ring
- **Motivation**: the user wanted clicking a project in the sidebar to highlight
  it on the canvas with a purple border, shown *only* after that click and
  cleared by any other interaction.
- **Goal**: a single source of truth the sidebar can turn on and the canvas can
  render + turn off.
- **Key decision**: add `projectHighlighted` (default false) with
  `highlightProject` / `clearProjectHighlight`. It is set true ONLY by the
  sidebar project-item click; `openNode`, `loadProject`, `startResearch`, and
  `newResearch` all reset it to false so deep-links / refreshes / new research
  never show it. `loadProject` clears it, so the sidebar sets the flag in a
  `.then()` after the load resolves to avoid the clear racing the highlight.

### 2026-06-14 — loadProject can open a node (deep-link support)
- **Motivation**: with `?project=&node=` now in the URL, a refresh/deep-link must
  load the project *and* reopen the reading overlay on a specific node.
- **Goal**: let `loadProject(id, openNodeId?)` open the node in the same set as
  the project load (no intermediate state that would make the URL flicker).
- **Key decision**: set `activeNodeId` to the requested node up front (ignoring a
  stale id not in the snapshot), then call `openNode` so a bookmarked stub node
  that was never filled in still generates its article.

### 2026-06-14 — Coalesce token updates to one render per frame
- **Motivation**: tokens arrive faster than the browser paints, and each
  `onContent` triggers a markdown reflow; firing a `set`/render per token was
  wasteful and amplified the streaming jitter.
- **Goal**: throttle the per-token `onContent` to at most one update per
  animation frame without dropping the final partial.
- **Key decision**: in `generateContentStream`, keep only the latest partial and
  flush it via `requestAnimationFrame` (direct call where rAF is unavailable);
  flush once more after the stream ends so the last partial always lands.

### 2026-06-14 — Stream content-mode generation (typewriter)
- **Motivation**: `openNode` / `growChild` filled a node's article via the
  one-shot `POST /generate` (`await res.json()`), so the reading overlay showed
  a spinner until the whole article popped in — the user noticed the streaming
  output was gone.
- **Goal**: type the body out live while the model generates, then settle the
  authoritative result (questions/summary/tags) from the stream's `final` event.
- **Key decision**: read `POST /api/research/generate-stream` via raw `fetch` +
  `getReader()` (the typed RPC client can't model SSE), reconstruct the model's
  raw JSON from `token` events and feed it through `extractStreamingContent` to
  update `node.content` per token. Outline mode keeps the non-stream `generate`
  (a tree, not a typed-out body). On stream failure, clear the partial
  `content` so the `openNode` guard (`|| node.content`) can't block a retry.
- **Motivation**: The canvas switched to a nested-outline hierarchical view that
  lays nodes out in document flow, so the `layoutNodes`/`relayout` pass that
  stamped `x`/`y` onto every node was dead work.
- **Goal**: Stop computing/persisting coordinates the renderer no longer reads.
- **Key decision**: Removed the `relayout` helper and the `layout.ts` import;
  node creation no longer sets `x`/`y`.

### 2026-06-13 — Created
- **Motivation**: The merged Research Canvas needs client state + an AI/persist
  bridge, in NanoBee's optimistic-update + RPC style.
- **Goal**: One store that runs the whole canvas closed loop.
- **Key decision**: Snapshot-per-project persistence (debounced); a separate
  store rather than extending `useAppStore`.

### 2026-06-14 — Thread `focusParagraph` through deep-dive (Phase B)
- **Motivation**: deep-dive should grow the child around the reader's in-context
  interest, not the bare term.
- **Goal**: accept `focusParagraph` on `growChild` and forward it to
  `/generate-stream`.
- **Key decision**: optional param on `growChild` + the stream body; no change
  to the snapshot shape (it's per-call generation context, not node state).

### 2026-06-14 — Add `askInReading` for inline Q&A turns (Phase C)
- **Motivation**: custom follow-ups should be answered inline below the article,
  not grow a new child node.
- **Goal**: an action that appends a loading turn to `node.userQuestionTurns`,
  streams the answer into it, and persists.
- **Key decision**: reuse `generateContentStream` (content mode) grounded in the
  node's own article as context; a concise dedicated Q&A prompt is a possible
  later refinement (today the answer is a full-length article).
