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
