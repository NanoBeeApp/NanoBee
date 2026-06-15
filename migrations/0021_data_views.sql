-- Data views: extend the existing `artifacts` table so one table holds both
-- legacy word decks (kind='word') and the new chat-generated data views
-- (kind='data_view'). A data view stores its FeedQuery + async pipeline status
-- instead of a card deck; the per-item stream lives in data_view_items (0022).
--
-- All columns are nullable / defaulted so existing word rows are untouched and
-- the NOT NULL deck_json constraint still holds (data_view rows store '{}' there).
-- Single D1 table, no Durable Objects (current scale fits one D1). item_count is
-- a denormalized counter updated with a one-shot COUNT() recompute on upsert,
-- never an in-place increment, so there is no high-frequency write race.

ALTER TABLE artifacts ADD COLUMN query_json     TEXT;     -- FeedQuery JSON (data_view only)
ALTER TABLE artifacts ADD COLUMN pipeline_status TEXT;    -- pending|fetching|filtering|extracting|templating|ready|error
ALTER TABLE artifacts ADD COLUMN source         TEXT;     -- data-hub source id
ALTER TABLE artifacts ADD COLUMN topic_id       TEXT;     -- topic class for today-feed grouping (P2/P3)
ALTER TABLE artifacts ADD COLUMN item_count     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE artifacts ADD COLUMN default_view   TEXT;     -- list|card|table|timeline
ALTER TABLE artifacts ADD COLUMN last_fetched_at INTEGER; -- unix seconds of last successful fetch
ALTER TABLE artifacts ADD COLUMN error_text     TEXT;     -- last pipeline error, when status='error'

-- Partial index for a future cron sweep of unfinished pipelines.
CREATE INDEX IF NOT EXISTS idx_artifacts_pipeline_pending
  ON artifacts (pipeline_status)
  WHERE pipeline_status IN ('pending', 'fetching');

PRAGMA optimize; -- SQLite/D1 only; drop this line on a Postgres self-host copy
