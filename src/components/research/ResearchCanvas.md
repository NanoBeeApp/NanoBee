# components/research/ResearchCanvas.tsx

## File responsibility
The pan/zoom viewport that renders the node tree as a nested outline
(hierarchical view): a research-topic banner followed by outline items, each
indented under its parent along a vertical rail.

## Core exports / API
- `ResearchCanvas()` — reads nodes/order/activeNodeId from the store.
- `NodeBranch` (internal) — recursive outline node + its indented children.

## Dependencies
- Upstream: `store/useResearchStore.ts`, `ResearchNodeCard.tsx`, `research/types.ts`.
- Downstream: `components/research/ResearchView.tsx`.

## Key implementation notes
- Structure is derived from each node's `parentId` + the store `order` via
  `buildChildrenMap`; there are no per-node coordinates. The browser lays the
  outline out in normal document flow.
- Transform (`tx/ty/scale`) lives in local state for performance. The
  fixed-width outline column (`OUTLINE_WIDTH`) is horizontally centered the first
  time a *new* project's nodes arrive. Drag background to pan; ctrl/⌘+wheel (or
  pinch) zooms around the cursor, plain wheel pans.
- **Per-topic viewport memory**: the canvas is re-mounted per topic
  (`key={projectId}` in ResearchView), so the transform is simply *initialised*
  from that topic's saved pan/zoom (`canvas-viewport.ts` → `loadViewport`). A
  debounced effect saves on every change and an unmount cleanup flushes the
  latest, so each topic restores its own scroll position + zoom across switches
  and full reloads. The centering effect bails when a saved viewport exists.
- The lit card is `focusNodeId ?? activeNodeId` (`highlightId`), so clicking a
  sidebar outline row highlights the matching canvas card *immediately* (during
  the scroll phase), not only once the reading overlay opens ~1s later.

## Change history

### 2026-06-14 — Remove the sidebar focus-scroll delay machinery
- **Motivation**: the user wants a sidebar-row click to open the overlay
  immediately, so the `focusNodeId` smooth-scroll-then-wait is gone.
- **Goal**: drop the now-unused focus path; the canvas still scrolls to the node
  instantly via the `activeNodeId` effect.
- **Key decision**: removed the `focusNodeId` subscription + effect and the
  `.rc-world.is-animating` transition; `highlightId` is now just
  `highlightedNodeId`.

### 2026-06-14 — Card highlight persists after closing the reading overlay
- **Motivation**: closing the reading overlay cleared the lit canvas card, but
  the user wants the highlight to stay until they click blank canvas or another
  card.
- **Goal**: decouple the canvas highlight from `activeNodeId` (which nulls on
  close) so it survives closing the overlay.
- **Key decision**: drive the lit card off the store's new `highlightedNodeId`
  (`highlightId = focusNodeId ?? highlightedNodeId`); a press on blank canvas
  (not a card/banner) in `onPointerDown` calls `clearNodeHighlight()`. Opening
  another node moves the highlight (the store sets `highlightedNodeId`).

### 2026-06-14 — Per-topic canvas viewport memory + instant card highlight
- **Motivation**: switching research topics reset the canvas to center, losing
  where each topic was scrolled/zoomed; and clicking a sidebar row didn't light
  the matching canvas card until the overlay opened ~1s later.
- **Goal**: remember each topic's pan + zoom separately (across switches and
  reloads) and highlight the target card the instant a sidebar row is clicked.
- **Key decision**: re-mount the canvas per topic via `key={projectId}` so the
  transform initialises from `loadViewport(projectId)` (no `setState`-in-effect,
  which react-hooks v7 flags when fed an external value); a brand-new topic with
  no saved viewport still centers via the literal-`setT` effect. Persist with a
  debounced save + an unmount flush (`canvas-viewport.ts`, localStorage — view
  state is per-device and far too hot for the D1 snapshot). Drive the card
  highlight off `focusNodeId ?? activeNodeId`.

### 2026-06-14 — Smooth focus-scroll before a sidebar-opened overlay
- **Motivation**: pairs with the store's `focusAndOpenNode` — a sidebar outline
  row should scroll the canvas to the node *visibly* before the reading overlay
  covers it.
- **Goal**: ease the scroll for that one move, leaving pan/zoom instant.
- **Key decision**: extract the `ty`-nudge into `nudgeToCard(id)` shared by the
  `activeNodeId` effect (instant) and a new `focusNodeId` effect (smooth); gate a
  `transform` transition behind `.rc-world.is-animating`, toggled only while
  `focusNodeId` is set.

### 2026-06-14 — Project-selection highlight on the banner
- **Motivation**: the user wanted clicking a project in the left sidebar to mark
  it on the canvas with a purple border, and to clear that mark on the next
  interaction.
- **Goal**: render a brand-purple ring on the topic banner driven by the store's
  `projectHighlighted` flag, and drop it as soon as the user touches the canvas.
- **Key decision**: read `projectHighlighted` to toggle `.is-selected` on the
  banner (a layout-neutral `outline`, so the title stays grid-aligned); call
  `clearProjectHighlight()` at the top of `onPointerDown` so any press on the
  canvas (background, node, or banner) counts as "clicking elsewhere". The flag
  is only ever set by the sidebar project click, never here.

### 2026-06-14 — Scroll the canvas to the active node
- **Motivation**: clicking a left-rail outline row opened the node but left the
  canvas wherever it was, so the picked card was often off-screen behind the
  reading overlay and out of place once it closed.
- **Goal**: make the canvas follow the active node (outline click, deep link,
  grown child) so the card is in view.
- **Key decision**: an effect on `activeNodeId` nudges `ty` (the world is
  transform-positioned, not natively scrolled) so the active card sits ~22% down
  the viewport; guarded by a `scrolledTo` ref + an 8px deadzone to avoid tiny
  jumps, vertical-only since the column is already centered.

### 2026-06-14 — Share buildChildrenMap with the sidebar outline
- **Motivation**: The new left-rail `ResearchOutlineTree` needed the exact same
  parent→children derivation, which had been a file-local copy here.
- **Goal**: Remove the duplication so both the in-canvas outline and the sidebar
  tree read from one source of truth.
- **Key decision**: Move `buildChildrenMap` into `src/research/outline.ts` and
  import it here; behaviour is unchanged.

### 2026-06-14 — Stop horizontal swipe from triggering browser back/forward
- **Motivation**: A horizontal trackpad swipe over the canvas was being handed to
  the browser as back/forward navigation, yanking the user off the page mid-pan.
- **Goal**: Keep all horizontal wheel/swipe gestures inside the canvas pan.
- **Key decision**: React's `onWheel` registers a *passive* listener, so its
  `preventDefault()` is ignored. Switched to a native `wheel` listener attached
  via `useEffect` with `{ passive: false }` and call `preventDefault()` there;
  added `overscroll-behavior: none` on `.rc-viewport` as a CSS backstop.

### 2026-06-13 — Replace tidy-tree with nested-outline hierarchical view
- **Motivation**: The ported canvas defaulted to a top-down tidy-tree *diagram*,
  which is not how Curve's canvas works — Curve's default is a nested outline
  (the "层级视图"). The user flagged the tree default as wrong.
- **Goal**: Default the canvas to Curve's hierarchical nested-outline layout
  while keeping the pan/zoom board interaction.
- **Key decision**: Render structure from `parentId`/`order` in document flow
  (banner + recursive `NodeBranch` with a `.rc-rail`), dropping the absolute
  positioning, the SVG edge layer, and the `layout.ts` tidy-tree entirely.

### 2026-06-13 — Created
- **Motivation**: Reproduce Curve's canvas interaction (comfortable-scale entry,
  pan/zoom) in a compact component on NanoBee's white surface.
- **Goal**: A self-contained viewport driven entirely by store state.
- **Key decision**: Local transform state + pointer/wheel handlers instead of a
  canvas library.
