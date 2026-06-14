# research/prompt.ts

## File responsibility
Builds the system + user prompt pair for one research generation call, in
either outline mode (title tree + brief tree) or content mode (one article).

## Core exports / API
- `resolveMode(input)` — outline vs content (explicit override, else inferred
  from `question` presence).
- `buildResearchMessages(input)` → `{ system, user }`.
- `REPAIR_INSTRUCTION` — retry message when the first reply fails the schema.

## Dependencies
- Upstream: `research/contract.ts` (FOLLOWUP_COUNT), `research/types.ts`.
- Downstream: `worker/research/generate.ts`.

## Key implementation notes
- Ported and condensed from Curve's `core/ai/prompt-{outline,content,shared}.ts`.
- Prompt *content* is Chinese (product output for Chinese users); only comments
  are English per the public-repo language rule.
- Fixed at exactly 3 follow-ups. Dropped (vs Curve): KaTeX contract, answer
  styles, explore mode, the two-layer meta-prompt (single call for the MVP).
- Kept the bold-term emphasis rule because bold terms double as clickable
  deep-dive entries on the canvas — a core interaction.

## Change history

### 2026-06-13 — Created
- **Motivation**: Reproduce Curve's content-quality bar (narrative, case-driven,
  high-density, three follow-ups) when generating nodes through NanoBee's AI.
- **Goal**: One prompt builder covering both the outline and article modes.
- **Key decision**: Single-call generation for the MVP (skip Curve's two-layer
  meta-prompt) to halve latency/cost; can be reintroduced later if quality needs
  it. Deep-dive is supported via an optional `focusTerm` anchor block.

### 2026-06-14 — Ground deep-dives in their paragraph (Phase B)
- **Motivation**: the bare `focusTerm` lost the context the reader clicked from.
- **Goal**: include the anchor's enclosing paragraph in the content prompt.
- **Key decision**: add an optional `focusParagraph` line inside the existing
  anchor block (background only — the model must not just restate it).
