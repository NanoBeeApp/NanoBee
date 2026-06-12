# src/worker/agent/loop.ts

## Responsibility
The agent loop: iterative tool-calling until the model produces a final
answer. Replaces single-shot Q&A — the model chains data fetches, skills and
MCP calls and decides on its own when it has enough to answer.

## Core exports / API
- `runAgentLoop(env, cfg, baseMessages): Promise<AgentRunResult>` —
  `{ text, toolsUsed: {tool, ok}[] }`

## Flow
1. `collectAgentTools` gathers the runtime toolset (may be empty → plain call)
2. Up to `CONFIG.AGENT.MAX_ITERATIONS` turns: offer tools, execute requested
   calls in parallel, append results, repeat
3. The final iteration offers no tools, forcing a plain answer; a system
   nudge before it tells the model to wrap up

## Dependencies
- Upstream: `routes/messages.ts`
- Downstream: `agent/tools`, `ai/client` (generateAgentTurn), `config`

## Notes
- Tool failures are returned to the model as `Error: ...` strings — it can
  retry differently or answer without the data; the loop itself never dies on
  a tool error.
- Per-tool timeout (`TOOL_TIMEOUT_MS`) and result truncation
  (`MAX_TOOL_RESULT_CHARS`) bound each iteration.

## Change history

### 2026-06-12 — created
- **Motivation**: single-shot route-then-answer (the old `datahub/augment`)
  could fetch at most one source and could not react to results; the user
  asked for a real agent cycle with tools, skills and MCP.
- **Key decision**: native function calling on both wire protocols instead of
  JSON-text routing — more reliable parsing, parallel tool calls per turn,
  provider-agnostic via `generateAgentTurn`.
