# config.ts

## Responsibility
Single source of truth for backend constants (API prefix, CORS settings,
default list limit). Route files must reference this instead of hardcoding.

## Core exports / API
- `CONFIG` — constants object, including `CONFIG.AUTH` (session cookie name
  and TTL, email-code TTL/limits, OAuth state TTL, password rules, default
  email sender, Google/GitHub endpoint URLs + scopes)

## Dependencies
- Upstream: none
- Downstream: `api-worker.ts`, `routes/api.ts`, `auth/*`, `routes/auth/*`

## Change history

### 2026-06-12 — created
- **Motivation**: template init; repo rule forbids duplicating magic
  strings/numbers across files.
- **Goal**: one place to change CORS/limits later.

### 2026-06-12 — `as const` removed
- **Motivation**: `hono/cors` expects mutable `string[]` options; the
  template's `as const` made them `readonly` tuples and failed typecheck.

### 2026-06-12 — switch project domain to nanobee.app
- **Motivation**: the project got its own domain `nanobee.app`; the previous
  `windseed.app` sender address belonged to another project.
- **Goal**: default email sender becomes `NanoBee <noreply@nanobee.app>`.

### 2026-06-12 — AUTH section added
- **Motivation**: the auth feature introduced a dozen tunables (TTLs,
  limits, provider endpoints); scattering them across modules violates the
  single-config rule.
- **Goal**: every auth constant referenced via `CONFIG.AUTH`.

### 2026-06-12 — CONFIG.AI section
- **Motivation**: the LLM chat pipeline needs tunables (request timeout, max
  completion tokens, field length cap, system prompt); per the single-config
  rule they live here, while the provider catalog stays in
  `src/lib/ai-providers.ts` because the frontend needs it too.

### 2026-06-12 — drop AI.SYSTEM_PROMPT
- **Motivation**: per request, the chat pipeline should no longer inject a
  product-persona system prompt into LLM calls; the model now replies without
  any preset voice.
- **Goal**: remove `CONFIG.AI.SYSTEM_PROMPT` entirely (messages route stops
  prepending the system message). The optional reading-context system message
  (`ctxTitle`) is functional context and stays.

### 2026-06-12 — DATA_HUB + AGENT sections
- **Motivation**: the agent loop needs bounded behavior (iteration cap,
  per-tool timeout, result truncation) and the data-hub client needs its own
  request timeout; per the single-config rule they live here.
- **Goal**: `CONFIG.DATA_HUB` (hub request timeout) and `CONFIG.AGENT`
  (MAX_ITERATIONS / TOOL_TIMEOUT_MS / MAX_TOOL_RESULT_CHARS).

### 2026-06-13 — AGENT.TRACE_MAX_OUTPUT_CHARS
- **Motivation**: traces persist inside message payloads; stored tool
  outputs need a tighter cap (2k) than what the model sees (8k).

### 2026-06-14 — raise AI.MAX_COMPLETION_TOKENS 800 → 4096
- **Motivation**: after the default model became OpenRouter Gemini 3.5 Flash,
  chat replies came back truncated mid-sentence (or as a leaked reasoning
  fragment). Root cause: Gemini 3.5 Flash reasons mandatorily (~1000-1300
  tokens/turn, not disableable nor meaningfully cappable on OpenRouter), and
  the OpenAI-style `max_tokens` budgets the hidden reasoning trace AND the
  visible answer together — so an 800 cap was eaten by reasoning before the
  answer was written (`finish_reason: "length"`).
- **Goal**: give completions enough headroom that reasoning + a full answer
  both fit; verified live against OpenRouter that 4096 yields a clean
  `finish_reason: "stop"` for a verbose answer.
- **Key decision**: treat the cap as a safety ceiling, not a length target —
  answer brevity, if ever wanted, belongs in the prompt, not in a tiny cap
  that truncates output. Provider-agnostic (non-reasoning models simply stop
  when done).
