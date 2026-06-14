# worker/research/generate.ts

## File responsibility
Drives the configured AI model to generate one research node, validates the
reply against the contract, and retries once with a repair instruction.

## Core exports / API
- `generateResearchNode(cfg, input)` → `ResearchGenerationResult`.
- `generateResearchNodeStream(cfg, input, onDelta)` → `ResearchGenerationResult`
  — streams raw model tokens through `onDelta`, then validates the full reply
  (one non-streamed repair retry on contract failure). Used for content mode.

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
