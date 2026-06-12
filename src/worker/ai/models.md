# src/worker/ai/models.ts

## Responsibility
Server-side fetch of a provider's available model list, so the setup dialog can
offer a dropdown instead of asking the user to type a model id by hand. Runs on
the worker only — keeps the API key off the browser and avoids provider CORS.

## Core exports / API
- `listProviderModels(input): Promise<string[]>` — GET `{baseUrl}/models` with
  the right auth headers for the protocol; returns de-duplicated, sorted model
  ids. Throws with a short diagnosable message on non-2xx or network failure.
- `ListModelsInput` — `{ protocol, baseUrl, apiKey }`

## Dependencies
- Upstream: `lib/ai-providers.ts` (AiProtocol), `worker/config.ts` (timeout)
- Downstream: `worker/routes/ai-settings.ts` (POST /api/ai/models)

## Notes
- Both wire protocols expose `GET /models` returning `{ data: [{ id }] }`;
  Anthropic needs `x-api-key` + `anthropic-version`, OpenAI-style needs
  `Authorization: Bearer`.
- OpenRouter's `/models` works even without a key, so the built-in OpenRouter
  key (or no key) still returns a list.
- Providers without a usable `/models` are gated upstream via the catalog's
  `canListModels` flag — this module is never called for them.

## Change history

### 2026-06-12 — created
- **Motivation**: users wanted models fetched automatically when configuring a
  provider, rather than copy-pasting model ids from each vendor's docs.
- **Goal**: one small fetch helper covering both wire protocols, reused by the
  `/api/ai/models` endpoint.
- **Key decision**: do it server-side (key secrecy + CORS) and return only the
  list of ids; selection/persistence stays in the existing settings flow.
