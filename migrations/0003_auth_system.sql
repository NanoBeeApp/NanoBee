-- Migration 0003: full auth system (email + password, Google / GitHub OAuth).
-- Replaces the 0001 smoke-test users table with a real account table and
-- adds OAuth account links, server-side sessions and email verification codes.

-- The 0001 table only ever held smoke-test rows; recreate it with the
-- auth-grade schema (TEXT id, verification flag, optional password hash).
DROP TABLE IF EXISTS users;

CREATE TABLE users (
	id TEXT PRIMARY KEY,
	email TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL DEFAULT '',
	image TEXT,
	-- 1 once the email is confirmed via code or a trusted OAuth provider
	email_verified INTEGER NOT NULL DEFAULT 0,
	-- PBKDF2 hash ("pbkdf2$iterations$salt$hash"); NULL for OAuth-only users
	password_hash TEXT,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- One row per linked OAuth identity (google / github).
CREATE TABLE auth_accounts (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	provider TEXT NOT NULL,
	provider_account_id TEXT NOT NULL,
	-- Email reported by the provider at link time (informational)
	email TEXT,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	UNIQUE (provider, provider_account_id)
);

CREATE INDEX idx_auth_accounts_user ON auth_accounts(user_id);

-- Server-side sessions. The id is the SHA-256 hex of the cookie token,
-- so a leaked database dump cannot be replayed as a session cookie.
CREATE TABLE auth_sessions (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at INTEGER NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	ip TEXT,
	user_agent TEXT
);

CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);

-- Short-lived email verification codes (stored hashed, attempt-limited).
CREATE TABLE auth_email_codes (
	id TEXT PRIMARY KEY,
	email TEXT NOT NULL,
	code_hash TEXT NOT NULL,
	attempts INTEGER NOT NULL DEFAULT 0,
	expires_at INTEGER NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_auth_email_codes_email ON auth_email_codes(email);

PRAGMA optimize;
