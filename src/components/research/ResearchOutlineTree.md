# ResearchOutlineTree

## Responsibility
Renders the left-rail outline tree (研究目录) for the currently open research
project: a recursive, depth-indented table of contents of the project's nodes.
Each row jumps to that node's reading overlay; the active node is highlighted.
This is the sidebar counterpart to the in-canvas outline drawn by
`ResearchCanvas`.

## Core exports / API
- `ResearchOutlineTree()` — connected component. Reads `nodes`, `order`,
  `activeNodeId`, `focusAndOpenNode` from `useResearchStore`; builds a
  parent→children map from `parentId` + `order`; renders the root's children as a
  nested `<ul>`. Clicking a row calls `focusAndOpenNode(id)` (canvas smooth-scrolls
  to the node, then its reading overlay opens after ~1s). Renders a
  "大纲生成中…" placeholder while the root has no children yet.
- `OutlineRow` (file-local, recursive) — one node row + its indented children,
  mirroring `ResearchCanvas`'s `NodeBranch` pattern (recursive helper co-located
  with its connected parent).

## Dependencies
- Upstream: `useResearchStore` (state + `focusAndOpenNode`), `research/outline`
  (`buildChildrenMap`), `research/types` (`ResearchNode`).
- Downstream: rendered by `sidebar/ResearchNavList` when a project is open on the
  research canvas.
- Styling: `nb-outline-*` classes in `src/styles/app.css`.

## Key implementation notes
- Structure is derived purely from `parentId` + the store's `order` via the
  shared `buildChildrenMap` helper (the same one `ResearchCanvas` uses) — no
  per-row coordinates.
- The root node (`order[0]`, carries the topic) is skipped; only its descendants
  are listed, matching Curve's `SidePanel`.
- Rows are text-only; the current node is marked by an amber row background, not a
  leading status dot.
- The highlighted row is `focusNodeId ?? activeNodeId` (`highlightId`), so the
  clicked row lights up *immediately* (during the scroll-to-card phase) rather
  than only once the reading overlay opens ~1s later.

## Change history

### 2026-06-14 — highlight the clicked row immediately
- **Motivation**: clicking a row didn't mark it as current until the reading
  overlay opened ~1s later, so the click felt unacknowledged (and the matching
  canvas card stayed un-lit too).
- **Goal**: light the clicked row the instant it's pressed.
- **Key decision**: highlight off `focusNodeId ?? activeNodeId` instead of just
  `activeNodeId` — `focusNodeId` is set synchronously by `focusAndOpenNode`,
  `activeNodeId` only when the overlay opens. Mirrors the same change in
  `ResearchCanvas` so the row and its canvas card light up together.

### 2026-06-14 — rows scroll-then-open instead of opening immediately
- **Motivation**: clicking a row opened the reading overlay instantly, so the
  canvas scroll to that node happened behind the modal and was never seen. The
  user wanted to watch the canvas move to the node first.
- **Goal**: smooth-scroll the canvas to the node, pause, then reveal the overlay.
- **Key decision**: switch the row action from `openNode` to the store's
  `focusAndOpenNode`, which sets `focusNodeId` (canvas eases to the node) and
  opens the overlay ~1s later. Canvas-card clicks still open immediately.

### 2026-06-14 — drop the leading status dots
- **Motivation**: the user asked to remove the dots in front of each outline
  entry; they read as a redundant status badge against the minimalist rail.
- **Goal**: a cleaner text-only tree.
- **Key decision**: rely on the amber row background for the current node;
  loading/failed status still shows on the canvas node cards, so the rail no
  longer needs per-row dots (removed `.nb-outline-dot` and the `status-*` class).

### 2026-06-14 — created
- **Motivation**: the user wanted the research canvas's left rail to stop showing
  a flat list of saved projects and instead show the open project's nodes as a
  tree-structured table of contents, like the upstream reference project Curve.
- **Goal**: port Curve's `SidePanel` outline tree (`outline-list / outline-row /
  outline-sub` in `overlays.tsx`) into a NanoBee left-rail outline component.
- **Key decisions**: (1) reuse `ResearchCanvas`'s `buildChildrenMap` to derive
  the structure, so it shares the same data source as the in-canvas outline; (2)
  follow the `NodeBranch` pattern by co-locating the recursive `OutlineRow` row
  with its connected parent component in one file; (3) switch the visuals to
  NanoBee's Radix tokens / white background / minimal borders, dropping Curve's
  sketchy warm-paper theme.
