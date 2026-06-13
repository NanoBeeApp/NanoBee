# src/components/chat/AgentTraceModal.tsx

## Responsibility
Debug modal rendering an `AgentTrace`: run metadata (provider / model /
iteration count / duration), the offered toolset as chips, and a per-
iteration timeline — the model's text plus every tool call's name,
arguments JSON, output (or error) and timing with an ok/fail dot.

## Core exports / API
- `AgentTraceModal({ trace, onClose })` — pure render; no own data fetching
- Testids: `agent-trace-modal` / `agent-trace-meta` / `agent-trace-toolset` /
  `agent-trace-iteration-{n}` / `agent-trace-tool-call` / `agent-trace-close`

## Dependencies
- Upstream: `MessageView.tsx` (open/close state lives there)
- Downstream: `lib/agent-trace` (types), `styles/agent-trace.css`, icons

## Notes
- Styling follows the app conventions: background tints (`--surface-2`)
  instead of borders, mono font for payloads, Radix grass-9/red-9 status
  dots; stylesheet is component-scoped (`agent-trace.css`).
- Outputs scroll inside a 220px max-height block so long tool results don't
  blow up the modal.

## Change history

### 2026-06-13 — created
- **Motivation**: expose the agent's execution process (actions, params,
  inputs/outputs, tools/APIs) in the UI for debugging.
- **Key decision**: pure-render component + state in MessageView, matching
  the project's container/presentational split.
