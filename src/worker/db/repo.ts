/**
 * D1 row <-> domain-type mapping for the NanoBee app tables.
 * Keeps SQL + JSON-payload (de)serialization in one place so route
 * handlers stay thin.
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { ChatMessage, ChatMeta, Task, UpdateItem } from "../../types";

interface ChatRow {
	id: string;
	topic_id: string;
	title: string;
	sub: string;
	grp: string;
	pinned: number;
}

interface MessageRow {
	chat_id: string;
	payload: string;
}

interface TaskRow {
	id: string;
	topic_id: string;
	title: string;
	status: string;
	payload: string;
}

interface UpdateRow {
	id: string;
	topic_id: string;
	grp: string;
	payload: string;
}

function rowToTask(r: TaskRow): Task {
	return {
		...(JSON.parse(r.payload) as Omit<Task, "id" | "topicId" | "title" | "status">),
		id: r.id,
		topicId: r.topic_id,
		title: r.title,
		status: r.status as Task["status"],
	};
}

export async function listChats(db: D1Database): Promise<ChatMeta[]> {
	// Pinned first, then newest chats on top (a freshly created chat must land at
	// the head of its time-group, not the tail). Seed rows share a timestamp and
	// keep their authored order via the rowid tie-breaker. Mirrors listTasks.
	const { results } = await db
		.prepare(
			"SELECT id, topic_id, title, sub, grp, pinned FROM chats ORDER BY pinned DESC, created_at DESC, rowid ASC",
		)
		.all<ChatRow>();
	return results.map((r) => ({
		id: r.id,
		topicId: r.topic_id,
		title: r.title,
		sub: r.sub,
		group: r.grp,
		pinned: r.pinned === 1,
	}));
}

export async function listConversations(
	db: D1Database,
): Promise<Record<string, ChatMessage[]>> {
	const { results } = await db
		.prepare("SELECT chat_id, payload FROM messages ORDER BY rowid ASC")
		.all<MessageRow>();
	const convos: Record<string, ChatMessage[]> = {};
	for (const r of results) {
		(convos[r.chat_id] ??= []).push(JSON.parse(r.payload) as ChatMessage);
	}
	return convos;
}

export async function listTasks(db: D1Database): Promise<Task[]> {
	// Newest user-created tasks first; seed rows share a timestamp and keep
	// their authored order via the rowid tie-breaker.
	const { results } = await db
		.prepare(
			"SELECT id, topic_id, title, status, payload FROM tasks ORDER BY created_at DESC, rowid ASC",
		)
		.all<TaskRow>();
	return results.map(rowToTask);
}

export async function getTask(db: D1Database, id: string): Promise<Task | null> {
	const row = await db
		.prepare("SELECT id, topic_id, title, status, payload FROM tasks WHERE id = ?")
		.bind(id)
		.first<TaskRow>();
	return row ? rowToTask(row) : null;
}

export async function listUpdates(db: D1Database): Promise<UpdateItem[]> {
	const { results } = await db
		.prepare("SELECT id, topic_id, grp, payload FROM updates ORDER BY rowid ASC")
		.all<UpdateRow>();
	return results.map((r) => ({
		...(JSON.parse(r.payload) as Omit<UpdateItem, "id" | "topicId" | "group">),
		id: r.id,
		topicId: r.topic_id,
		group: r.grp as UpdateItem["group"],
	}));
}
