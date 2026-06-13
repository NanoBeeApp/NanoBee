-- Migration 0005: per-user web-search (Tavily) API key.
-- Entered in the AI settings dialog alongside the provider key; stored
-- AES-256-GCM encrypted exactly like api_key_enc. NULL means "use NanoBee's
-- built-in default key" (TAVILY_API_KEY binding).

ALTER TABLE user_ai_settings ADD COLUMN web_search_key_enc TEXT;

PRAGMA optimize;
