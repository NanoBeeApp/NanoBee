# src/research/outline.ts

## Responsibility
Shared outline-structure helpers for the Research Canvas feature. Both the
in-canvas outline (`ResearchCanvas`) and the left-rail table of contents
(`ResearchOutlineTree`) render the same node hierarchy, so the parent→children
derivation lives here once instead of being duplicated per view.

## Core exports / API
- `buildChildrenMap(nodes, order)` — returns a `parentId → ordered childIds`
  map derived from the flat node map plus the snapshot `order` (which fixes
  sibling order, root first). The root id never appears as a value, so callers
  walk down from the root id.

## Dependencies
- Upstream: `research/types` (`ResearchNode`).
- Downstream: `components/research/ResearchCanvas`,
  `components/research/ResearchOutlineTree`.

## Key implementation notes
- Pure, platform-agnostic; no React or store imports, so it is unit-testable and
  reusable on both the client and the worker if ever needed.

## Change history

### 2026-06-14 — created
- **Motivation**: `buildChildrenMap` was copy-pasted into both `ResearchCanvas`
  and the new `ResearchOutlineTree`; the sidebar tree work made the duplication
  concrete.
- **Goal**: extract the single source of truth for deriving outline structure
  from a node map + order.
- **Key decision**: keep it a tiny pure module under `src/research/` (alongside
  `types.ts`, `streaming.ts`) rather than exporting a util from a component file.
