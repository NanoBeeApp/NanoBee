# src/lib/agent-trace.ts

## Responsibility
Shared type definitions for the agent execution trace — the structured
record of one agent-loop run (iterations, tool calls with arguments /
output / timing, run metadata). Lives in src/lib so the worker (producer)
and the debug modal (consumer) share one definition.

## Core exports / API
- `AgentTraceToolCall` — `{name, arguments, output, ok, durationMs}`;
  arguments are as the model supplied them (injected secrets never appear)
- `AgentTraceIteration` — `{n, text, toolCalls}` (one model turn)
- `AgentTrace` — `{provider, model, tools, iterations, durationMs}`
- `TracedAiMessage` — `AiMessage & { trace?: AgentTrace }`

## Dependencies
- Upstream: `worker/agent/loop.ts`, `worker/routes/messages.ts`,
  `components/chat/MessageView.tsx`, `components/chat/AgentTraceModal.tsx`
- Downstream: `src/types` (AiMessage)

## Notes
- Kept in its own module (not src/types.ts) so the trace feature stays
  self-contained and avoids widening the core message union.

## Change history

### 2026-06-13 — created
- **Motivation**: debugging agent behavior required reading server logs; the
  user asked for an in-app debug modal showing what the agent did.
- **Key decision**: persist the trace inside the AI message payload so the
  modal works after reload, with tool outputs truncated for storage.
