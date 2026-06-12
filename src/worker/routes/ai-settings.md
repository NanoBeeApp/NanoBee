# src/worker/routes/ai-settings.ts

## Responsibility
HTTP surface for per-user AI provider settings, mounted at `/api/ai`:
- `GET /api/ai/settings` — saved settings (key masked to `hasApiKey`) plus
  backend defaults; `configured: false` drives the first-login setup dialog.
- `PUT /api/ai/settings` — zod-validated upsert with per-provider rules.
Both require a signed-in session (401 otherwise).

## Core exports / API
- `aiSettingsRoutes` (Hono sub-app, chained for typed RPC inference)

## Dependencies
- Upstream: `lib/ai-providers.ts`, `worker/ai/settings.ts`,
  `worker/auth/cookies.ts` + `worker/auth/store.ts` (session → user),
  `worker/config.ts`
- Downstream: `worker/routes/api.ts` (mount), `lib/useAiSettings.ts` (client)

## Notes
- Validation rules: `custom` requires a base URL; providers without a
  built-in fallback key (DeepSeek / OpenAI / Anthropic / custom) require a
  key now or one already on file for the *same* provider.
- Switching providers without sending a new key invalidates the stored key
  instead of silently reusing it against a different API.
- Raw keys travel request-inbound only; responses never echo them.

## Change history

### 2026-06-12 — created
- **Motivation**: new users must choose an AI provider and enter key/host/
  model after first login; the frontend needs a safe API that exposes
  configuration state without exposing secrets.
- **Key decision**: `apiKey` tri-state semantics (`undefined` keep / `""`
  clear / string replace) so the edit dialog can save unrelated changes
  without forcing users to re-enter their key.

### 2026-06-12 — review fix
- **Motivation**: code review found that a direct API call switching
  providers while omitting `apiKey` would carry the old provider's key over.
- **Goal**: a stored key is only ever sent to the provider it was entered for.

### 2026-06-12 — add POST /api/ai/models
- **Motivation**: auto-fetch the provider's model list so users pick from a
  dropdown rather than copy-pasting model ids from each vendor's docs.
- **Goal**: authenticated endpoint that resolves the effective key (request key
  → stored key for the same provider → built-in OpenRouter key) and returns the
  model ids via `listProviderModels`, never echoing the key.
- **Key decision**: gate on the catalog's `canListModels`; key resolution mirrors
  resolveAiConfig so behavior stays consistent with the chat pipeline.

### 2026-06-12 — add POST /api/ai/test + 抽取 resolveProbeKey
- **出发点**：弹窗需要「测试连接」验证 provider 配置；/models 与 /test 的密钥解析逻辑重复。
- **目标**：抽 `resolveProbeKey`（请求 key→同 provider 存储 key→内置 OpenRouter key）供两路复用；/test 对 canListModels 用 /models（返回延迟+模型数），其余用 pingChatModel。
- **关键决策**：连接失败返回 200 `{ok:false,error}`（请求成功、连接失败语义清晰）；错误信息只给状态码不泄露 key。
