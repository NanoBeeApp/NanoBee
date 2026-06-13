# worker/research/generate.ts

## File responsibility
Drives the configured AI model to generate one research node, validates the
reply against the contract, and retries once with a repair instruction.

## Core exports / API
- `generateResearchNode(cfg, input)` → `ResearchGenerationResult`.

## Dependencies
- Upstream: `worker/ai/client.ts` (`generateChatText`), `worker/ai/settings.ts`
  (`AiRuntimeConfig`), `research/{prompt,contract,types}.ts`.
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
