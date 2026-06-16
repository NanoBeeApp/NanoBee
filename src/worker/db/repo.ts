/**
 * D1 row <-> domain-type mapping for the NanoBee app tables.
 * Keeps SQL + JSON-payload (de)serialization in one place so route
 * handlers stay thin.
 *
 * Every function accepts an `owner` string that scopes the query to one
 * user's bucket (signed-in user id, or "anon" for signed-out visitors),
 * mirroring the pattern in src/worker/artifacts/repo.ts.
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { ChatMessage, ChatMeta, Task, TriggerSpec, UpdateItem } from "../../types";
import { ANON_OWNER as _ANON_OWNER } from "../artifacts/repo";

/** Owner bucket for signed-out visitors — re-exported so callers can import from one place. */
export const ANON_OWNER = _ANON_OWNER;

/** Number of messages returned per chat in the bootstrap payload (the most recent window). */
export const BOOTSTRAP_MSG_LIMIT = 30;

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
	/** Structured trigger spec JSON (may be null when the task predates the column). */
	trigger_spec: string | null;
}

/** Extended row shape that includes the scheduler columns added in migration 0013. */
export interface SchedulerTaskRow {
	id: string;
	topic_id: string;
	title: string;
	status: string;
	owner: string;
	payload: string;
	trigger_spec: string | null;
	last_run_at: number | null;
	next_run_at: number | null;
	scheduler_state: string | null;
}

interface UpdateRow {
	id: string;
	topic_id: string;
	grp: string;
	payload: string;
}

function rowToTask(r: TaskRow): Task {
	const triggerSpec: TriggerSpec | undefined = r.trigger_spec
		? (JSON.parse(r.trigger_spec) as TriggerSpec)
		: undefined;
	return {
		...(JSON.parse(r.payload) as Omit<Task, "id" | "topicId" | "title" | "status">),
		id: r.id,
		topicId: r.topic_id,
		title: r.title,
		status: r.status as Task["status"],
		...(triggerSpec ? { triggerSpec } : {}),
	};
}

export async function listChats(db: D1Database, owner: string): Promise<ChatMeta[]> {
	// Pinned first, then newest chats on top (a freshly created chat must land at
	// the head of its time-group, not the tail). Seed rows share a timestamp and
	// keep their authored order via the rowid tie-breaker. Mirrors listTasks.
	const { results } = await db
		.prepare(
			"SELECT id, topic_id, title, sub, grp, pinned FROM chats WHERE owner = ? ORDER BY pinned DESC, created_at DESC, rowid ASC",
		)
		.bind(owner)
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
	owner: string,
): Promise<Record<string, ChatMessage[]>> {
	const { results } = await db
		.prepare("SELECT chat_id, payload FROM messages WHERE owner = ? ORDER BY rowid ASC")
		.bind(owner)
		.all<MessageRow>();
	const convos: Record<string, ChatMessage[]> = {};
	for (const r of results) {
		(convos[r.chat_id] ??= []).push(JSON.parse(r.payload) as ChatMessage);
	}
	return convos;
}

/** Per-chat pagination metadata returned alongside the trimmed bootstrap conversations. */
export interface ConvoPagination {
	/** Whether earlier messages exist beyond the returned window. */
	hasMore: boolean;
	/**
	 * Opaque pagination cursor for the oldest message in the current window.
	 * Format: "<created_at>_<id>" — pass as the `before` query param to
	 * GET /api/chats/:id/messages to load the next older page.
	 * Null when there are no messages or hasMore is false.
	 */
	oldestCursor: string | null;
}

/**
 * Encodes a (created_at, id) pair into the opaque cursor string used by the
 * load-older pagination API.  The separator `_` is safe because message ids
 * use the nanoid alphabet (A-Za-z0-9_-) but we rely on the fact that created_at
 * is a positive integer with no underscores — the first `_` is always the split
 * point.
 */
export function encodeCursor(createdAt: number, id: string): string {
	return `${createdAt}_${id}`;
}

/**
 * Parses an opaque cursor produced by `encodeCursor`.
 * Returns null when the cursor is missing or malformed (callers treat it as
 * "no cursor / fetch from the very beginning").
 */
export function decodeCursor(cursor: string): { createdAt: number; id: string } | null {
	const idx = cursor.indexOf("_");
	if (idx <= 0) return null;
	const ts = Number(cursor.slice(0, idx));
	if (!Number.isFinite(ts) || ts <= 0) return null;
	const id = cursor.slice(idx + 1);
	if (!id) return null;
	return { createdAt: ts, id };
}

/** Extended message row that includes created_at and id for cursor construction. */
interface MessageRowWithCursor extends MessageRow {
	id: string;
	created_at: number;
}

/**
 * Bootstrap-time variant: returns only the most recent `limit` messages per
 * chat, along with a `hasMore` flag and cursor for each chat so the frontend
 * knows whether it should offer to load older messages.
 *
 * Messages within each chat are returned oldest→newest (reading order).
 *
 * Strategy: N+1 bounded queries — first fetch the distinct chat_ids for the
 * owner, then for each chat run a LIMIT `limit+1` descending query. This keeps
 * memory bounded to O(chats × limit × payload) instead of O(all messages ever).
 * The composite index `idx_messages_owner_chat_pagination (owner, chat_id, created_at DESC, id DESC)`
 * added in migration 0020 makes each per-chat query a single index seek.
 */
export async function listConversationsTrimmed(
	db: D1Database,
	owner: string,
	limit: number,
): Promise<{
	conversations: Record<string, ChatMessage[]>;
	pagination: Record<string, ConvoPagination>;
}> {
	// Step 1: fetch the distinct chat_ids that have messages for this owner.
	// Using DISTINCT avoids loading any payloads at this stage.
	const { results: chatIdRows } = await db
		.prepare("SELECT DISTINCT chat_id FROM messages WHERE owner = ?")
		.bind(owner)
		.all<{ chat_id: string }>();

	const conversations: Record<string, ChatMessage[]> = {};
	const pagination: Record<string, ConvoPagination> = {};

	// Step 2: for each chat, fetch only the newest `limit+1` rows (limit+1 lets
	// us detect hasMore without a separate COUNT). D1 batching is used to avoid
	// N sequential round-trips.
	if (chatIdRows.length === 0) {
		return { conversations, pagination };
	}

	const statements = chatIdRows.map(({ chat_id }) =>
		db
			.prepare(
				"SELECT id, created_at, payload FROM messages WHERE owner = ? AND chat_id = ? ORDER BY created_at DESC, id DESC LIMIT ?",
			)
			.bind(owner, chat_id, limit + 1),
	);

	// D1 batch executes all statements in a single HTTP round-trip.
	const batchResults = await db.batch<MessageRowWithCursor>(statements);

	for (let i = 0; i < chatIdRows.length; i++) {
		const chatId = chatIdRows[i].chat_id;
		const rows = batchResults[i].results ?? [];

		const hasMore = rows.length > limit;
		// Take only the newest `limit` rows (rows[0] is newest due to DESC sort).
		const page = hasMore ? rows.slice(0, limit) : rows;
		// Re-sort oldest→newest for display.
		page.reverse();

		conversations[chatId] = page.map((r) => JSON.parse(r.payload) as ChatMessage);
		const oldest = page.length > 0 ? page[0] : null;
		pagination[chatId] = {
			hasMore,
			oldestCursor: oldest ? encodeCursor(oldest.created_at, oldest.id) : null,
		};
	}

	return { conversations, pagination };
}

/**
 * Cursor-based older-messages page for one chat.
 * Returns the `limit` messages older than the given cursor, ordered
 * oldest→newest (i.e. they slot in before the already-loaded window).
 * `hasMore` is true when additional rows exist beyond this page.
 *
 * The cursor is an opaque string produced by `encodeCursor(created_at, id)`.
 * The WHERE predicate uses a compound (created_at < ?) OR (created_at = ? AND id < ?)
 * to correctly handle ties within the same second.
 */
export async function listMessagesPage(
	db: D1Database,
	chatId: string,
	owner: string,
	beforeCursor: string,
	limit: number,
): Promise<{ messages: ChatMessage[]; hasMore: boolean; oldestCursor: string | null }> {
	const cursor = decodeCursor(beforeCursor);
	if (!cursor) {
		return { messages: [], hasMore: false, oldestCursor: null };
	}
	const { createdAt, id: beforeId } = cursor;

	// Fetch `limit + 1` rows newest-first so we can detect hasMore without a
	// separate COUNT query.
	// Compound cursor predicate handles ties within the same second correctly.
	const { results } = await db
		.prepare(
			`SELECT id, created_at, payload FROM messages
			  WHERE owner = ? AND chat_id = ?
			    AND (created_at < ? OR (created_at = ? AND id < ?))
			  ORDER BY created_at DESC, id DESC
			  LIMIT ?`,
		)
		.bind(owner, chatId, createdAt, createdAt, beforeId, limit + 1)
		.all<MessageRowWithCursor>();

	const hasMore = results.length > limit;
	const rows = hasMore ? results.slice(0, limit) : results;
	// Re-sort oldest→newest for the frontend.
	rows.reverse();

	const oldest = rows.length > 0 ? rows[0] : null;
	return {
		messages: rows.map((r) => JSON.parse(r.payload) as ChatMessage),
		hasMore,
		oldestCursor: oldest ? encodeCursor(oldest.created_at, oldest.id) : null,
	};
}

export async function listTasks(db: D1Database, owner: string): Promise<Task[]> {
	// Newest user-created tasks first; seed rows share a timestamp and keep
	// their authored order via the rowid tie-breaker.
	const { results } = await db
		.prepare(
			"SELECT id, topic_id, title, status, payload, trigger_spec FROM tasks WHERE owner = ? ORDER BY created_at DESC, rowid ASC",
		)
		.bind(owner)
		.all<TaskRow>();
	return results.map(rowToTask);
}

export async function getTask(db: D1Database, id: string, owner: string): Promise<Task | null> {
	const row = await db
		.prepare("SELECT id, topic_id, title, status, payload, trigger_spec FROM tasks WHERE id = ? AND owner = ?")
		.bind(id, owner)
		.first<TaskRow>();
	return row ? rowToTask(row) : null;
}

export async function listUpdates(db: D1Database, owner: string): Promise<UpdateItem[]> {
	const { results } = await db
		.prepare("SELECT id, topic_id, grp, payload FROM updates WHERE owner = ? ORDER BY rowid ASC")
		.bind(owner)
		.all<UpdateRow>();
	return results.map((r) => ({
		...(JSON.parse(r.payload) as Omit<UpdateItem, "id" | "topicId" | "group">),
		id: r.id,
		topicId: r.topic_id,
		group: r.grp as UpdateItem["group"],
	}));
}

/**
 * Write one proactive feed row for an owner. Called by the scheduler cron
 * handler after a trigger fires. The full UpdateItem is stored as-is in the
 * payload column (same shape as seed rows) so the Today page needs no changes.
 */
export async function createUpdate(
	db: D1Database,
	owner: string,
	update: Omit<UpdateItem, "id" | "topicId" | "group"> & {
		id: string;
		topicId: string;
		group: UpdateItem["group"];
	},
): Promise<void> {
	const { id, topicId, group, ...rest } = update;
	await db
		.prepare(
			`INSERT INTO updates (id, owner, topic_id, grp, payload)
       VALUES (?, ?, ?, ?, ?)`,
		)
		.bind(id, owner, topicId, group, JSON.stringify(rest))
		.run();
}

/**
 * List all active tasks that have a trigger_spec set and are due to run
 * (next_run_at <= cutoff, or next_run_at IS NULL for tasks that have never
 * been run). Used exclusively by the scheduled() cron handler — reads across
 * ALL owners, not scoped to one user.
 */
export async function listActiveDueTasks(
	db: D1Database,
	cutoff: number,
): Promise<SchedulerTaskRow[]> {
	const { results } = await db
		.prepare(
			`SELECT id, topic_id, title, status, owner, payload,
              trigger_spec, last_run_at, next_run_at, scheduler_state
       FROM tasks
       WHERE status = 'active'
         AND trigger_spec IS NOT NULL
         AND (next_run_at IS NULL OR next_run_at <= ?)`,
		)
		.bind(cutoff)
		.all<SchedulerTaskRow>();
	return results ?? [];
}

/**
 * Persist the last_run_at and next_run_at timestamps after a task fires.
 * Also persists updated scheduler_state (e.g. last observed metric value).
 * nextRunAt null = no further scheduled run (e.g. the task is now paused externally).
 */
export async function updateTaskSchedulerState(
	db: D1Database,
	id: string,
	lastRunAt: number,
	nextRunAt: number | null,
	schedulerState: string | null,
): Promise<void> {
	await db
		.prepare(
			`UPDATE tasks SET last_run_at = ?, next_run_at = ?, scheduler_state = ? WHERE id = ?`,
		)
		.bind(lastRunAt, nextRunAt, schedulerState, id)
		.run();
}
