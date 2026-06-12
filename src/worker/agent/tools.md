# src/worker/agent/tools.ts

## Responsibility
Agent tool contracts (`AgentTool`) and the collector that gathers tools from
all providers (data-hub sources, built-in skills, MCP servers). Keeps the
toolset open-ended: nothing upstream hardcodes a tool name.

## Core exports / API
- `AgentTool` — `AiToolDef` + `execute(args, env): Promise<string>`
- `sanitizeToolName(raw)` — restrict to `[A-Za-z0-9_-]`, ≤64 chars
- `collectAgentTools(env)` — gather from all providers; each provider fails
  independently to `[]`; first provider wins on name collisions

## Dependencies
- Upstream: `agent/loop.ts`
- Downstream: `agent/datahub-tools`, `agent/skills`, `agent/mcp`, `ai/client` (types)

## Notes
- Provider order (hub → skills → MCP) doubles as collision priority so a
  remote MCP server can never shadow a built-in skill or hub source.

## Change history

### 2026-06-12 — created
- **Motivation**: evolving single-shot Q&A into an agent loop needs one
  uniform tool abstraction over an unbounded set of capabilities.
- **Key decision**: providers are independent and discovered at runtime —
  adding a source/skill/server requires no changes here or in the loop.
