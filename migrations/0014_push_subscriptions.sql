-- Migration 0014: Web Push subscription storage.
--
-- One row per browser/device per user. The push subscription endpoint is the
-- browser's push service URL (not a secret; stored plaintext for lookups).
-- p256dh is the browser's P-256 DH public key (base64url; not secret).
-- auth_enc holds the push auth secret encrypted exactly like user_provider_keys.api_key_enc
-- ("v1$iv$ciphertext" AES-256-GCM with key derived from AUTH_SECRET).
--
-- UNIQUE (user_id, endpoint) ensures an upsert on re-subscribe does not
-- duplicate rows (browser may re-generate the same endpoint after a service
-- worker update).

CREATE TABLE push_subscriptions (
  id          TEXT PRIMARY KEY,          -- 'sub_' + nanoid(12)
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,             -- PushSubscription endpoint URL
  p256dh      TEXT NOT NULL,             -- browser DH public key (base64url)
  auth_enc    TEXT NOT NULL,             -- push auth secret, AES-256-GCM encrypted
  user_agent  TEXT,                      -- optional device label
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions (user_id);

PRAGMA optimize;
