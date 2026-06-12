# src/worker/agent/mcp.ts

## Responsibility
MCP tool provider: connects to MCP servers declared in the `MCP_SERVERS`
binding, discovers their tools via JSON-RPC `tools/list`, and exposes them
as agent tools named `mcp_<server>_<tool>`.

## Core exports / API
- `mcpTools(env): Promise<AgentTool[]>` — `[]` when MCP_SERVERS is unset;
  per-server failures degrade to that server contributing nothing

## Dependencies
- Upstream: `agent/tools.ts` (collector)
- Downstream: configured MCP servers (e.g. the data hub's `/mcp` endpoint)

## Notes
- Speaks MCP streamable HTTP: single POST endpoint, `initialize` →
  `notifications/initialized` → `tools/list` / `tools/call`; carries
  `Mcp-Session-Id` when the server issues one and parses both plain-JSON and
  SSE-framed responses.
- `MCP_SERVERS` accepts `{"name": "url"}` or `[{name, url}]` JSON.
- Tool calls reuse the discovery connection's session within a request.

## Change history

### 2026-06-12 — created
- **Motivation**: the agent should reach any MCP-speaking service, not only
  the data hub — MCP is the interoperable way to plug in new capability
  servers without writing providers.
- **Key decision**: hand-rolled minimal JSON-RPC client (~150 lines) instead
  of the official SDK, per the project's lightweight-dependency principle.
