# src/lib/ai-providers.ts

## Responsibility
Shared AI provider catalog: the single source of truth for which providers
NanoBee supports (OpenRouter / DeepSeek / OpenAI / Anthropic / custom), their
default base URLs, default models, wire protocols and key requirements.
Imported by both the worker (settings resolution, validation) and the
frontend (setup dialog UI), so the two can never disagree.

## Core exports / API
- `AI_PROVIDERS: AiProviderInfo[]` — ordered catalog (OpenRouter first)
- `DEFAULT_AI_PROVIDER` — `"openrouter"` (backend default)
- `AI_PROVIDER_IDS` — non-empty tuple of ids for zod `z.enum`
- `getProviderInfo(id)` — lookup with fallback to the default provider
- Types: `AiProviderId`, `AiProtocol`, `AiProviderInfo`

## Dependencies
- Upstream: none (pure data)
- Downstream: `worker/ai/settings.ts`, `worker/routes/ai-settings.ts`,
  `lib/useAiSettings.ts`, `components/onboarding/*`

## Notes
- The backend default model is `deepseek/deepseek-v4-flash` on OpenRouter
  (verified live against the OpenRouter models API).
- `hint` strings are zh-CN UI copy rendered under the provider picker.

## Change history

### 2026-06-12 — created
- **Motivation**: new users must pick an AI provider (key / host / model)
  after first login, and the backend needs the same catalog to validate and
  resolve settings; duplicating the list on both sides would drift.
- **Key decision**: keep it dependency-free pure data under `src/lib/` so the
  worker bundle can import it without pulling in client code.
