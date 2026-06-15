-- Migration 0011: per-user, per-provider API key vault for multi-model compare.
--
-- The original `user_ai_settings` table (0004) holds a SINGLE provider+key —
-- it decides which model the main chat uses. The compare page lets a user run
-- one prompt across models from DIFFERENT providers at once, so it needs to
-- store one key per provider. This table is that key vault; it is independent
-- of `user_ai_settings` and does not change the main chat behavior.
--
-- Keys are AES-256-GCM encrypted (key derived from AUTH_SECRET), never plaintext,
-- exactly like `user_ai_settings.api_key_enc`. OpenRouter rows are optional: that
-- provider rides on NanoBee's built-in key when the user has not added their own.

CREATE TABLE user_provider_keys (
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	-- Provider id from the shared catalog (src/lib/ai-providers.ts)
	provider TEXT NOT NULL,
	-- API base URL override; '' means "use the provider's default host"
	base_url TEXT NOT NULL DEFAULT '',
	-- Encrypted API key ("v1$iv$ciphertext"); NULL only for the OpenRouter
	-- built-in-key case (a row may exist just to pin a base_url override).
	api_key_enc TEXT,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
	PRIMARY KEY (user_id, provider)
);

PRAGMA optimize;
