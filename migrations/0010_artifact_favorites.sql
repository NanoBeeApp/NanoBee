-- Favorites for artifacts. The Artifacts page now has a "你收藏的" (favorites)
-- tab alongside "你创建的" (created by you) and the category browse tabs, so an
-- artifact needs a per-owner favorite flag.
--
-- A boolean column on the existing row (not a join table): favoriting is scoped
-- to the same owner that owns the artifact, so there is no many-to-many to model
-- yet. Promote to a join table only if cross-owner favorites (saving someone
-- else's public artifact) ship later.

ALTER TABLE artifacts ADD COLUMN favorited INTEGER NOT NULL DEFAULT 0;

-- Partial index so the favorites tab lists only flagged rows efficiently.
CREATE INDEX IF NOT EXISTS idx_artifacts_owner_favorited
  ON artifacts (owner, created_at DESC)
  WHERE favorited = 1;
