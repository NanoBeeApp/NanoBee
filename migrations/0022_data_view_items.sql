-- The per-item stream for a data view. One row per fetched item, keyed by a
-- content hash so re-fetches (manual refresh, future cron) dedupe via
-- INSERT OR IGNORE rather than re-inserting. The raw source item is stored
-- whole (raw_json) for dynamic card binding; AI-extracted fields and relevance
-- scores arrive in P2 as separate columns/tables.
--
-- `owner` is denormalized onto each item so deletes/queries don't have to JOIN
-- artifacts. Scoped exactly like artifacts (signed-in user id, or "anon").

CREATE TABLE IF NOT EXISTS data_view_items (
  id                 TEXT PRIMARY KEY,
  view_id            TEXT NOT NULL,           -- artifacts.id of the owning data view
  owner              TEXT NOT NULL,
  source             TEXT NOT NULL,           -- data-hub source id
  source_external_id TEXT,                    -- the source's own id, when present
  content_hash       TEXT NOT NULL,           -- dedupe key (see worker/data-views/content-hash.ts)
  raw_json           TEXT NOT NULL,           -- full normalized source item
  item_created_at    INTEGER,                 -- item's own timestamp (unix seconds), when known
  inserted_at        INTEGER NOT NULL DEFAULT (unixepoch())
);

-- One row per (view, content) — makes refresh idempotent via INSERT OR IGNORE.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dvi_view_hash
  ON data_view_items (view_id, content_hash);

-- Newest-first listing within a view.
CREATE INDEX IF NOT EXISTS idx_dvi_view_inserted
  ON data_view_items (view_id, inserted_at DESC);

PRAGMA optimize; -- SQLite/D1 only; drop this line on a Postgres self-host copy
