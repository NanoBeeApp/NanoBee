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
- `streamAgentText(cfg, messages, onDelta, opts?)` → `string` — tool-free
  streaming completion; awaits `onDelta(delta)` for each text chunk (so callers
  can apply backpressure / forward in order) and returns the full text
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

### 2026-06-12 — add pingChatModel
- **出发点**：连接测试要覆盖没有 /models 端点的 provider（智谱、通义）。
- **目标**：发一个 max_tokens:1 的最小 chat 请求验证 key/host/model 连通性。
- **关键决策**：复用两种协议的 URL/header 构造，2xx 即视为连通，失败抛带状态码的可诊断错误。

### 2026-06-14 — add streamAgentText (SSE streaming)
- **Motivation**: the research reading detail page lost its typewriter output —
  the whole stack was one-shot (`await res.json()`), so the article only
  appeared after full generation.
- **Goal**: a tool-free streaming completion that yields text deltas as they
  arrive, reusing the same per-protocol payload construction as the non-stream
  path so research generation can pipe tokens to the client.
- **Key decision**: parse the provider SSE inline (OpenAI `choices[].delta.content`
  / Anthropic `content_block_delta`) over `res.body.getReader()` — no SDK; and
  make `onDelta` awaitable so the route can forward each token in order with
  proper backpressure instead of firing un-awaited writes.

### 2026-06-14 — `streamAgentTurn` (streaming agent turn with tools)
- **Motivation**: chat replies were non-streamed (one-shot JSON), so the
  default Gemini 3.5 Flash answer appeared all at once after a long wait. The
  agent loop needed a turn that streams content AND still collects tool calls.
- **Goal**: `streamAgentTurn` streams OpenAI `choices[].delta.content` through
  `onToken` while reassembling `delta.tool_calls` fragments (keyed by `index`)
  into the same `AgentTurn` shape; Anthropic falls back to one non-streamed
  turn emitted via a single `onToken`.
- **Key decision**: extract `toOpenAiChatBody` and share it with
  `generateAgentTurn` so streaming/non-streaming never drift on tools/caps/
  message mapping; reuse the same inline SSE parser style as `streamAgentText`.
