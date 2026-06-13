-- Migration 0009: per-user web-search provider selector.
-- Web search is no longer Tavily-only — users can choose Tavily, Brave, Serper
-- or Exa in the AI settings dialog. This column records which provider the
-- stored web_search_key_enc belongs to; the key is injected server-side into
-- the data-hub websearch source as `<provider>_api_key`. Existing rows default
-- to 'tavily', matching the previous behavior.

ALTER TABLE user_ai_settings ADD COLUMN web_search_provider TEXT NOT NULL DEFAULT 'tavily';

PRAGMA optimize;
