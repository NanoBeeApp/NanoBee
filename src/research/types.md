# research/types.ts

## File responsibility
Platform-agnostic domain types for the Research Canvas feature, shared by the
worker (AI generation + D1 persistence) and the client (canvas + store).

## Core exports / API
- `ResearchGenerationMode` / `ResearchGenerationInput` — input to one AI call.
- `ResearchOutlineItem` — node of the generated outline tree.
- `ResearchGenerationResult` — validated AI output (`content`, exactly 3
  `questions`, optional `summary` / `outline` / `tags`, provider metadata, and
  an optional `trace` — the generation execution trace, for debugging).
- `ResearchNode` — one knowledge node (structure via `parentId` + `depth`).
- `ResearchSnapshot` — a full project (nodes + order), the D1 persistence shape.
- `ResearchProjectMeta` — sidebar list entry.

## Dependencies
- Upstream: `research/generation-trace.ts` (the `ResearchGenerationTrace` type).
- Downstream: `research/contract.ts`, `research/prompt.ts`,
  `worker/research/*`, `components/research/*`, `store/useResearchStore.ts`.

## Key implementation notes
- Ported and trimmed from WindSeed Curve's `core/research` + `core/ai` types.
- Follow-up questions are fixed at exactly three (product invariant — every AI
  generation must offer three next steps).
- Nodes carry no layout coordinates: the canvas renders a nested outline whose
  structure comes from `parentId` + `depth` + the snapshot `order`. The snapshot
  is stored as one JSON blob per project (MVP).

## Change history

### 2026-06-18 — Add optional `style` to `ResearchGenerationInput`
- **Motivation**: the new Settings → 研究画布 → 回复风格 picker must reach the
  prompt builder so the outline + article voice changes per the chosen style.
- **Key decision**: optional `style?: ResearchReplyStyle` (type from
  `research/styles.ts`); absent → `DEFAULT_RESEARCH_STYLE`. Sent by the client
  store with each generate request and woven in by `research/prompt.ts`.

### 2026-06-15 — Add optional `trace` to `ResearchGenerationResult`
- **Motivation**: the generation execution trace (built by the worker) needs to
  reach the client so the canvas/reading overlay can render it for debugging.
- **Goal**: carry the trace alongside the validated result without a new endpoint.
- **Key decision**: an optional `trace?: ResearchGenerationTrace` field
  (defined in the new `research/generation-trace.ts`); optional so it stays
  backward-compatible and so the trace can be dropped without breaking the type.

### 2026-06-13 — Drop layout coordinates from ResearchNode
- **Motivation**: The canvas became a nested-outline hierarchical view (Curve's
  default) instead of an absolute tidy-tree, so `x`/`y` were dead fields.
- **Goal**: Make the type reflect that structure derives from `parentId`/`order`.
- **Key decision**: Removed `x`/`y`; old JSON snapshots that still carry them are
  harmless (ignored on load, stripped by the worker schema on save).

### 2026-06-13 — Created
- **Motivation**: Merge WindSeed Curve's core Research Canvas into NanoBee as a
  new view; needed a shared, dependency-light type layer first.
- **Goal**: One source of truth for node / snapshot / generation shapes usable
  on both the worker and the client.
- **Key decision**: Store full article + layout on the node and persist the
  whole snapshot as JSON (simpler than Curve's relational nodes/edges tables)
  for the MVP closed loop; relational normalization can come later for
  cross-view querying.

### 2026-06-14 — Add `focusParagraph` to the generation input (Phase B)
- **Motivation**: deep-diving a term/selection should grow the child around the
  reader's in-context point of interest, not the bare phrase.
- **Goal**: carry the enclosing paragraph through to the content prompt.
- **Key decision**: optional `focusParagraph` beside the existing `focusTerm`;
  the content prompt uses it only as background context.

### 2026-06-14 — Add `ResearchQnaTurn` + `node.userQuestionTurns` (Phase C)
- **Motivation**: the reader's custom follow-ups are answered inline (chat-style)
  rather than growing a child node, so they need to live on the node.
- **Goal**: a per-node list of `{ question, answer, status }` turns.
- **Key decision**: store turns on the node so they persist in the snapshot and
  re-render on reopen, alongside the article they were asked about.
