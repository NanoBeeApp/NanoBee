/**
 * Idempotent demo-data seeding for D1.
 * The TS modules under src/data/ stay the single source of truth for the
 * demo content; this module copies them into D1 once per empty database.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { CHATS } from "../../data/chats";
import { CONVERSATIONS } from "../../data/conversations";
import { INITIAL_TASKS } from "../../data/tasks";
import { INITIAL_UPDATES } from "../../data/updates";

// Per-isolate cache so we only hit the COUNT(*) check once per worker instance.
let seededInThisIsolate = false;

export async function ensureSeeded(db: D1Database): Promise<void> {
	if (seededInThisIsolate) return;

	const row = await db
		.prepare("SELECT COUNT(*) AS n FROM chats")
		.first<{ n: number }>();
	if ((row?.n ?? 0) > 0) {
		seededInThisIsolate = true;
		return;
	}

	const stmts = [];

	const insChat = db.prepare(
		"INSERT OR IGNORE INTO chats (id, topic_id, title, sub, grp, pinned) VALUES (?, ?, ?, ?, ?, ?)",
	);
	for (const c of CHATS) {
		stmts.push(insChat.bind(c.id, c.topicId, c.title, c.sub, c.group, c.pinned ? 1 : 0));
	}

	const insMsg = db.prepare(
		"INSERT OR IGNORE INTO messages (id, chat_id, role, payload) VALUES (?, ?, ?, ?)",
	);
	for (const [chatId, msgs] of Object.entries(CONVERSATIONS)) {
		for (const m of msgs) {
			stmts.push(insMsg.bind(m.id, chatId, m.role, JSON.stringify(m)));
		}
	}

	const insTask = db.prepare(
		"INSERT OR IGNORE INTO tasks (id, topic_id, title, status, payload) VALUES (?, ?, ?, ?, ?)",
	);
	for (const t of INITIAL_TASKS) {
		const { id, topicId, title, status, ...rest } = t;
		stmts.push(insTask.bind(id, topicId, title, status, JSON.stringify(rest)));
	}

	const insUpdate = db.prepare(
		"INSERT OR IGNORE INTO updates (id, topic_id, grp, unread, payload) VALUES (?, ?, ?, ?, ?)",
	);
	for (const u of INITIAL_UPDATES) {
		const { id, topicId, group, unread, ...rest } = u;
		stmts.push(insUpdate.bind(id, topicId, group, unread ? 1 : 0, JSON.stringify(rest)));
	}

	// D1 batches run as a single transaction — all-or-nothing.
	await db.batch(stmts);
	console.log("[seed] demo data inserted into empty database");
	seededInThisIsolate = true;
}
