-- Migration 0017: onboarding completion flag.
--
-- Adds an `onboarding_done` flag to the users table so the first-run
-- onboarding flow is shown exactly once to each new signed-in user and
-- never again after they complete (or skip) it.
--
-- The column defaults to 0 (not done) so new users automatically see the
-- flow; existing users who already have data should have it updated to 1
-- by the bootstrap endpoint when it detects they have existing tasks.

ALTER TABLE users ADD COLUMN onboarding_done INTEGER NOT NULL DEFAULT 0;

-- Index to speed up the per-user lookup in the bootstrap / onboarding route.
CREATE INDEX IF NOT EXISTS idx_users_onboarding
  ON users (id, onboarding_done);

PRAGMA optimize;
