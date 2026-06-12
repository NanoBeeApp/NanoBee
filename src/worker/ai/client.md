# src/worker/ai/client.ts

## Responsibility
Minimal LLM chat client over plain `fetch` — no provider SDKs. Speaks the two
wire protocols in the provider catalog: OpenAI-compatible
`/chat/completions` (OpenRouter, DeepSeek, OpenAI, custom gateways) and
Anthropic `/messages`. Returns the assistant's text or throws with a
diagnosable error (status + truncated body).

## Core exports / API
- `generateAgentTurn(cfg, messages: AgentChatMessage[], tools: AiToolDef[])`
  → `AgentTurn { text, toolCalls }` — one completion with native
  tool/function calling on both protocols
- `generateChatText(cfg: AiRuntimeConfig, messages: AiChatMessage[])` → `string`
  (tool-free wrapper around `generateAgentTurn`)
- Types: `AiChatMessage`, `AgentChatMessage` (adds assistant tool-call and
  tool-result roles), `AiToolDef`, `AiToolCall`, `AgentTurn`

## Dependencies
- Upstream: `worker/config.ts` (timeout, max tokens), `worker/ai/settings.ts` (types)
- Downstream: `worker/agent/loop.ts`, `worker/routes/messages.ts` (via reply fallback)

## Notes
- Requests abort after `CONFIG.AI.REQUEST_TIMEOUT_MS` via `AbortSignal.timeout`
  so a slow provider can never hang the chat endpoint.
- For the Anthropic protocol, system messages are folded into the top-level
  `system` field as the API requires.
- Sends the `X-Title: NanoBee` attribution header (OpenRouter convention,
  ignored by other providers).

## Change history

### 2026-06-12 — created
- **Motivation**: wire the chat reply to the user-configured provider
  (backend default DeepSeek V4 Flash via OpenRouter) without adding heavy
  SDK dependencies, per the project's lightweight-architecture principle.
- **Key decision**: support exactly the two protocols the catalog declares
  instead of an abstraction layer per provider — ~100 lines total, portable
  to both Cloudflare and self-hosted Node.

### 2026-06-12 — native tool calling for the agent loop
- **Motivation**: the agent loop needs the model to request tool invocations;
  JSON-text routing is fragile and cannot express parallel calls.
- **Goal**: one neutral message/turn shape (`AgentChatMessage` / `AgentTurn`)
  mapped to OpenAI `tools`/`tool_calls` and Anthropic `tool_use`/`tool_result`
  wire formats; `generateChatText` becomes a thin tool-free wrapper.
- **Key decision**: consecutive Anthropic tool results merge into a single
  user message, as the API requires one result turn per assistant tool turn.
