# src/research/generation-trace.ts

## Responsibility
Defines the shared `ResearchGenerationTrace` type: a structured, step-by-step
record of one research generation run (an outline tree or a single node's
article), captured for in-UI debugging. Models the research pipeline (build
prompt → model request → parse/validate → optional repair retry) as an ordered
list of steps, each carrying the exact messages sent, the raw model output,
timing, and any error.

## Core exports / API
- Types: `ResearchGenerationTrace`, `ResearchTraceStep`, `ResearchTraceMessage`,
  `ResearchTraceKind`, `ResearchTraceStepStatus`
- `MAX_TRACE_TEXT` — defensive cap on any single captured text blob
- `capTraceText(text)` — truncate a blob to the cap, annotating the cut
- `toTraceMessages(messages)` — map sent chat messages → capped trace messages

## Dependencies
- Upstream (builders): `src/worker/research/generate.ts`
- Downstream (consumers): `src/worker/routes/research.ts` (returns it),
  `src/store/useResearchStore.ts` (stores it in-session),
  `src/components/research/ResearchTraceModal.tsx` (renders it)
- No runtime imports — pure types + two tiny pure helpers (platform-agnostic).

## Notes / rationale
- Distinct from `src/lib/agent-trace.ts` (the chat agent loop's trace): research
  generation has NO tool calls or iterations — it is a fixed prompt→parse→repair
  pipeline, so a generic `steps[]` shape fits it better than `iterations[]`.
- The trace is intentionally NOT persisted in the D1 snapshot: it would bloat
  snapshots (full prompt + raw reply per node) for a debug-only aid. It is
  carried alongside the generation result and held in-session by the store.
- No secrets are ever in `messages`: API keys ride in request headers, never in
  the prompt body (BYOK invariant).

## Change history

### 2026-06-15 — created
- **Motivation**: the user wants to inspect, from the research canvas, exactly
  how the left-side outline and each article were generated (all execution
  steps), for debugging.
- **Goal**: a shared trace shape that captures the full research generation
  pipeline including the prompts sent and raw replies, reusable by worker
  (builder) and client (renderer).
- **Key decision**: a `steps[]` pipeline model (not the chat loop's
  `iterations[]`) because research generation is tool-free; keep it out of the
  persisted snapshot to avoid storage bloat.
