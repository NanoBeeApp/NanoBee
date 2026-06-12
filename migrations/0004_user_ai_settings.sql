-- Migration 0004: per-user AI provider settings.
-- New users pick an AI provider (API key / host / model) after their first
-- login; the backend default is OpenRouter + DeepSeek V4 Flash using
-- NanoBee's built-in key. API keys are stored AES-256-GCM encrypted
-- (key derived from the AUTH_SECRET), never in plaintext.

CREATE TABLE user_ai_settings (
	user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	-- Provider id from the shared catalog (openrouter / deepseek / openai / anthropic / custom)
	provider TEXT NOT NULL,
	-- API base URL override; '' means "use the provider's default host"
	base_url TEXT NOT NULL DEFAULT '',
	-- Model id override; '' means "use the provider's default model"
	model TEXT NOT NULL DEFAULT '',
	-- Encrypted API key ("v1$iv$ciphertext"); NULL when using NanoBee's built-in key
	api_key_enc TEXT,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

PRAGMA optimize;
