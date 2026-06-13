-- Remove the read/unread feature: the Today page no longer tracks per-item
-- read state, so the `unread` column on `updates` is dropped.
ALTER TABLE updates DROP COLUMN unread;
