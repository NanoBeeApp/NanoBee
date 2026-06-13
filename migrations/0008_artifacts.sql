-- Artifacts: a dynamically generated piece of data produced from a chat
-- message (today: a card deck). One row per artifact, storing the full deck as
-- a JSON blob. Scoped to an owner bucket (signed-in user id, or "anon" for
-- signed-out visitors), and optionally linked to the chat it was created from.
--
-- The deck is kept as one JSON blob (not normalized into per-card rows): an
-- artifact is read and rendered whole, the card shape varies by kind, and we
-- have no cross-artifact card queries. Normalize later only if such queries
-- appear.

CREATE TABLE IF NOT EXISTS artifacts (
  id          TEXT PRIMARY KEY,
  owner       TEXT NOT NULL,
  kind        TEXT NOT NULL,           -- card kind, e.g. 'word'
  title       TEXT NOT NULL,
  deck_json   TEXT NOT NULL,           -- full CardDeck JSON
  card_count  INTEGER NOT NULL DEFAULT 0,
  chat_id     TEXT,                    -- originating chat, when created in chat
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_artifacts_owner
  ON artifacts (owner, created_at DESC);
