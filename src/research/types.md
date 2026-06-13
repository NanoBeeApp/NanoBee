# research/types.ts

## File responsibility
Platform-agnostic domain types for the Research Canvas feature, shared by the
worker (AI generation + D1 persistence) and the client (canvas + store).

## Core exports / API
- `ResearchGenerationMode` / `ResearchGenerationInput` — input to one AI call.
- `ResearchOutlineItem` — node of the generated outline tree.
- `ResearchGenerationResult` — validated AI output (`content`, exactly 3
  `questions`, optional `summary` / `outline` / `tags`, provider metadata).
- `ResearchNode` — one knowledge node on the canvas (incl. layout `x`/`y`).
- `ResearchSnapshot` — a full project (nodes + order), the D1 persistence shape.
- `ResearchProjectMeta` — sidebar list entry.

## Dependencies
- Upstream: none (pure types).
- Downstream: `research/contract.ts`, `research/prompt.ts`,
  `worker/research/*`, `components/research/*`, `store/useResearchStore.ts`.

## Key implementation notes
- Ported and trimmed from WindSeed Curve's `core/research` + `core/ai` types.
- Follow-up questions are fixed at exactly three (product invariant — every AI
  generation must offer three next steps).
- Layout coordinates live on the node and are persisted so the canvas restores
  exactly; the snapshot is stored as one JSON blob per project (MVP).

## Change history

### 2026-06-13 — Created
- **Motivation**: Merge WindSeed Curve's core Research Canvas into NanoBee as a
  new view; needed a shared, dependency-light type layer first.
- **Goal**: One source of truth for node / snapshot / generation shapes usable
  on both the worker and the client.
- **Key decision**: Store full article + layout on the node and persist the
  whole snapshot as JSON (simpler than Curve's relational nodes/edges tables)
  for the MVP closed loop; relational normalization can come later for
  cross-view querying.
