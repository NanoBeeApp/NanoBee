# src/lib/ai-providers.ts

## Responsibility
Shared AI provider catalog: the single source of truth for which providers
NanoBee supports (OpenRouter / OpenAI / Anthropic / Google Gemini / DeepSeek /
xAI / Groq / Mistral / Moonshot / Zhipu / DashScope / SiliconFlow / custom),
their default base URLs, default models, wire protocols, key requirements and
whether each exposes an auto-fetchable model-list endpoint (`canListModels`).
Imported by both the worker (settings resolution, validation, model listing)
and the frontend (setup dialog UI), so the two can never disagree.

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
- `canListModels` gates the "auto-fetch models" button; Zhipu and DashScope
  have no usable OpenAI-style `GET /models`, so they stay manual-entry only.
- Every provider except Anthropic speaks the OpenAI wire protocol; the
  non-OpenAI vendors are reached through their OpenAI-compatible endpoints.

## Change history

### 2026-06-12 — add mainstream providers + model-list flag
- **Motivation**: users asked to configure any mainstream LLM provider from the
  sidebar, with models fetched automatically instead of typed by hand.
- **Goal**: broaden the catalog to the common vendors and mark which ones
  support auto-fetching their model list.
- **Key decision**: route every non-Anthropic vendor through its OpenAI-
  compatible base URL so one client path covers them all; add `canListModels`
  rather than probing `/models` blindly for providers that lack it.

### 2026-06-12 — created
- **Motivation**: new users must pick an AI provider (key / host / model)
  after first login, and the backend needs the same catalog to validate and
  resolve settings; duplicating the list on both sides would drift.
- **Key decision**: keep it dependency-free pure data under `src/lib/` so the
  worker bundle can import it without pulling in client code.
