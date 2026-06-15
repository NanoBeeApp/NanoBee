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
