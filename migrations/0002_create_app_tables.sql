-- Core NanoBee app tables.
-- Frequently-queried fields are real columns; rich display content
-- (paragraphs, extras, config chips) is stored as a JSON payload column.

CREATE TABLE chats (
	id TEXT PRIMARY KEY,
	topic_id TEXT NOT NULL,
	title TEXT NOT NULL,
	sub TEXT NOT NULL DEFAULT '',
	grp TEXT NOT NULL DEFAULT '今天',
	pinned INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE messages (
	id TEXT PRIMARY KEY,
	chat_id TEXT NOT NULL REFERENCES chats(id),
	role TEXT NOT NULL,
	-- Full ChatMessage JSON (paragraphs, extras, citations, suggestions...)
	payload TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_messages_chat ON messages(chat_id);

CREATE TABLE tasks (
	id TEXT PRIMARY KEY,
	topic_id TEXT NOT NULL,
	title TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'active',
	-- Remaining Task fields JSON (trigger, schedule, last/next, result...)
	payload TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE updates (
	id TEXT PRIMARY KEY,
	topic_id TEXT NOT NULL,
	grp TEXT NOT NULL,
	unread INTEGER NOT NULL DEFAULT 1,
	-- Remaining UpdateItem fields JSON (title, summary, body, source...)
	payload TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
