-- Research Canvas: one row per research project, storing the full canvas
-- snapshot (nodes + layout) as a JSON blob. Scoped to an owner bucket
-- (signed-in user id, or "anon" for signed-out visitors).
--
-- The relational node/edge model from WindSeed Curve is intentionally not
-- reproduced yet; a single JSON snapshot per project is enough for the canvas
-- closed loop and keeps reads/writes to one row. Normalize later if/when
-- cross-project querying (tag views, relation graphs) is needed.

CREATE TABLE IF NOT EXISTS research_projects (
  id            TEXT PRIMARY KEY,
  owner         TEXT NOT NULL,
  title         TEXT NOT NULL,
  topic         TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  node_count    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_research_projects_owner
  ON research_projects (owner, updated_at DESC);
