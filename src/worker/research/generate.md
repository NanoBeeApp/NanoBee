# worker/research/generate.ts

## File responsibility
Drives the configured AI model to generate one research node, validates the
reply against the contract, and retries once with a repair instruction.

## Core exports / API
- `generateResearchNode(cfg, input)` → `ResearchGenerationResult` (with a
  `trace` attached).
- `generateResearchNodeStream(cfg, input, onDelta)` → `ResearchGenerationResult`
  — streams raw model tokens through `onDelta`, then validates the full reply
  (one non-streamed repair retry on contract failure). Used for content mode.
- `ResearchGenerationError` — thrown on failure; carries the partial
  `ResearchGenerationTrace` so the route can return it for debugging.

## Dependencies
- Upstream: `worker/ai/client.ts` (`generateChatText`, `streamAgentText`),
  `worker/ai/settings.ts` (`AiRuntimeConfig`), `research/{prompt,contract,types}.ts`.
- Downstream: `worker/routes/research.ts`.

## Key implementation notes
- Reuses NanoBee's existing chat client so research generation rides on the
  same per-user provider settings as chat (the "reuse AI config" integration).
- One repair retry: re-sends the bad reply + `REPAIR_INSTRUCTION`; throws if the
  second reply still fails the contract.

## Change history

### 2026-06-16 — Fix /generate 502 (raise the token budget)
- **Motivation**: `POST /api/research/generate` returned 502 for outline mode.
  The failure trace showed both the first reply and the repair retry truncated
  mid-string → invalid JSON (`did not return JSON content`, then a `SyntaxError`
  on the unterminated array).
- **Root cause**: outline mode emits the largest payload NanoBee asks for — an
  `outline` title tree plus a full mirrored `outlineBriefs` tree (every title
  duplicated, ≤120-char brief per node), ~8–11k output tokens, and on the
  default Gemini 3.5 Flash that budget is shared with ~1000–1300 mandatory
  reasoning tokens. The old `maxTokens: 4000` cap truncated the JSON.
- **Fix**: raise `CALL_OPTS` to `maxTokens: 16_000` (ceiling, not target — the
  model stops when the JSON closes) with `timeoutMs: 120_000` headroom. No
  contract or prompt change. Streaming path shares `CALL_OPTS`, so it benefits too.

### 2026-06-15 — Build a generation trace (incl. on failure)
- **Motivation**: the user wants to inspect, from the research canvas, exactly
  how the outline and each article were generated (every execution step), for
  debugging — and debugging matters most when generation fails.
- **Goal**: record each pipeline step (build prompt → model request → parse →
  repair) with the messages sent, raw output, and timing, and surface it even
  when the run fails.
- **Key decision**: build a `ResearchGenerationTrace` in both functions and
  attach it to the success result; on failure, throw a `ResearchGenerationError`
  carrying the (partial) trace so the route can return it. Extracted shared
  `callModel` / `repairAndFinalize` helpers to keep the streamed and
  non-streamed paths from drifting on how steps are recorded.

### 2026-06-13 — Created
- **Motivation**: Replace Curve's mock canvas data with real AI generation,
  routed through NanoBee's provider stack instead of Curve's 3-mode gateway.
- **Goal**: A single function the route can call to get a contract-valid node.
- **Key decision**: Single-call generation + one repair retry (no streaming yet)
  for the MVP closed loop.

### 2026-06-14 — Add streaming content generation
- **Motivation**: content mode (the reading detail page) was one-shot — the
  article only appeared after the whole JSON finished, so it read as "spinner →
  pop", with no live output.
- **Goal**: stream the body to the client as it generates while keeping the
  authoritative contract validation (and repair retry) the non-stream path has.
- **Key decision**: stream the raw tokens via `streamAgentText`, then run the
  exact same `parseModelPayload` + repair on the full reply. The repair retry is
  intentionally NON-streamed — its authoritative result overwrites the (already
  shown) malformed tokens on the rare contract miss.
