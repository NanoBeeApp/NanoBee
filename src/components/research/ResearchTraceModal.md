# src/components/research/ResearchTraceModal.tsx

## Responsibility
Debug modal rendering a `ResearchGenerationTrace`: run metadata (provider /
model / mode / step count / duration), ok-or-fail + repaired badges, and the
ordered pipeline steps — each with a status dot, the messages sent to the
model, the raw model output, timing, and any error. Pure render: receives the
trace and an `onClose`.

## Core exports / API
- `ResearchTraceModal({ trace, onClose })` — pure render; no own data fetching
- Testids: `research-trace-modal` / `research-trace-meta` /
  `research-trace-step-{i}` / `research-trace-close`

## Dependencies
- Upstream: `ResearchTraceLauncher.tsx` (owns the open/close state)
- Downstream: `research/generation-trace` (types), `styles/research-trace.css`,
  icons

## Notes
- Mirrors the chat `AgentTraceModal` pattern (container/presentational split)
  but renders research's `steps[]` pipeline rather than the agent loop's
  `iterations[]`.
- Reuses the global modal shell classes (`nb-modal-scrim` / `nb-modal` /
  `nb-ai-close` from app.css); all step styling is research-scoped
  (`rc-trace-*` in research-trace.css) so it doesn't depend on the chat
  stylesheet. Follows app conventions: surface tints over borders, mono font
  for payloads, Radix grass/red status dots; raw output scrolls in a capped
  block so a long reply can't blow up the modal.

## Change history

### 2026-06-15 — created
- **Motivation**: let users inspect, from the research canvas, exactly how the
  outline and each article were generated (every execution step) for debugging.
- **Goal**: a pure-render modal for `ResearchGenerationTrace`, reusing the chat
  trace modal's look while fitting research's prompt→parse→repair pipeline.
- **Key decision**: pure render + state in `ResearchTraceLauncher`, matching the
  project's container/presentational split; self-contained `rc-trace-*` styles.
