/**
 * Task scheduling engine — pure rules-based cron evaluator.
 *
 * Called from the scheduled() handler in src/server.ts. Iterates all active
 * tasks that have a trigger_spec and are due, then writes proactive feed rows
 * to the updates table for each task whose trigger fires.
 *
 * Design constraints (hard rules):
 * - NO LLM calls — all logic is deterministic rules.
 * - NO user API key usage.
 * - nanoid() / Date.now() / new Date() MUST only be called inside function
 *   scope, never at module/global level (Workers deploy validation rule).
 * - One task failure must not crash the whole cron tick.
 */

import { nanoid } from "nanoid";
import type { Env } from "../api-worker";
import type {
	ConditionOp,
	ConditionTrigger,
	ScheduleTrigger,
	TriggerSpec,
} from "../../types";
import type { DataSourceResult } from "../datahub/client";
import { invokeDataSource, isDataHubEnabled } from "../datahub/client";
import {
	createUpdate,
	listActiveDueTasks,
	updateTaskSchedulerState,
	type SchedulerTaskRow,
} from "../db/repo";
import type { UserNotificationSettings } from "../routes/notification-settings";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Main entry point: process all active, due tasks for one cron tick.
 * Called via ctx.waitUntil(runScheduler(env)) from server.ts scheduled().
 */
export async function runScheduler(env: Env): Promise<void> {
	const now = Math.floor(Date.now() / 1000);
	console.log("[scheduler] tick at", now);

	let dueTasks: SchedulerTaskRow[];
	try {
		dueTasks = await listActiveDueTasks(env.DB, now);
	} catch (err) {
		console.error("[scheduler] failed to list due tasks:", String(err));
		return;
	}

	console.log("[scheduler] due tasks:", dueTasks.length);

	for (const row of dueTasks) {
		try {
			await processTask(env, row, now);
		} catch (err) {
			// Never let one task failure stop the rest of the tick.
			console.error("[scheduler] task", row.id, "failed:", String(err));
		}
	}
}

/**
 * Compute the next UTC wall-clock fire time (unix seconds) for a schedule
 * trigger. Always returns a time strictly after `after`.
 *
 * IMPORTANT: this function is exported so tasks.ts can call it on creation
 * and re-arm. Must only be called inside request/handler/function scope —
 * never at module top-level.
 */
export function computeNextRunAt(spec: ScheduleTrigger, after: number): number {
	const d = new Date(after * 1000);
	d.setUTCHours(spec.hour, spec.minute, 0, 0);
	// If the computed time is not strictly in the future, advance by one day.
	if (Math.floor(d.getTime() / 1000) <= after) {
		d.setUTCDate(d.getUTCDate() + 1);
	}
	return Math.floor(d.getTime() / 1000);
}

// ---------------------------------------------------------------------------
// Internal task processing
// ---------------------------------------------------------------------------

async function processTask(env: Env, row: SchedulerTaskRow, now: number): Promise<void> {
	if (!row.trigger_spec) return;

	let spec: TriggerSpec;
	try {
		spec = JSON.parse(row.trigger_spec) as TriggerSpec;
	} catch {
		console.error("[scheduler] invalid trigger_spec JSON for task", row.id);
		return;
	}

	if (spec.kind === "schedule") {
		await evaluateScheduleTask(env, row, spec, now);
	} else if (spec.kind === "condition") {
		await evaluateConditionTask(env, row, spec, now);
	}
}

// ---------------------------------------------------------------------------
// Schedule task evaluation
// ---------------------------------------------------------------------------

async function evaluateScheduleTask(
	env: Env,
	row: SchedulerTaskRow,
	spec: ScheduleTrigger,
	now: number,
): Promise<void> {
	const feedMessage = spec.message ?? `Scheduled update: ${row.title}`;
	const updateId = `upd_${nanoid(12)}`;

	await createUpdate(env.DB, row.owner, {
		id: updateId,
		topicId: row.topic_id,
		icon: "clock",
		color: "#6366f1",
		tone: "info",
		title: row.title,
		time: "Just now",
		group: "今天",
		summary: feedMessage,
		body: [feedMessage],
		source: "scheduler",
	});

	const nextRunAt = computeNextRunAt(spec, now);
	await updateTaskSchedulerState(env.DB, row.id, now, nextRunAt, row.scheduler_state);

	console.log("[scheduler] schedule task", row.id, "fired; next at", nextRunAt);

	// Attempt Web Push (Phase 1b) — non-blocking, errors logged only.
	await attemptPushForOwner(env, row.owner, {
		title: row.title,
		body: feedMessage,
	}).catch((e) => console.warn("[scheduler] push failed for owner", row.owner, String(e)));
}

// ---------------------------------------------------------------------------
// Condition task evaluation
// ---------------------------------------------------------------------------

/** Persisted per-task cron state. Stored as JSON in scheduler_state column. */
interface SchedulerState {
	lastValue?: number | null;
	lastTriggeredAt?: number;
}

async function evaluateConditionTask(
	env: Env,
	row: SchedulerTaskRow,
	spec: ConditionTrigger,
	now: number,
): Promise<void> {
	// Check cooldown first — avoid unnecessary data-hub calls.
	if (row.last_run_at !== null && now - row.last_run_at < spec.cooldownSeconds) {
		// Still in cooldown; update next_run_at to the cooldown expiry.
		const nextRunAt = row.last_run_at + spec.cooldownSeconds;
		await updateTaskSchedulerState(env.DB, row.id, row.last_run_at, nextRunAt, row.scheduler_state);
		return;
	}

	if (!isDataHubEnabled(env)) {
		console.warn("[scheduler] data hub not configured; skipping condition task", row.id);
		// Set next_run_at to now + cooldown so we don't hammer on every tick.
		const nextRunAt = now + spec.cooldownSeconds;
		await updateTaskSchedulerState(env.DB, row.id, row.last_run_at ?? now, nextRunAt, row.scheduler_state);
		return;
	}

	const result = await invokeDataSource(env, spec.sourceId, spec.params ?? {});
	if (!result) {
		console.warn("[scheduler] data hub unreachable for source", spec.sourceId, "task", row.id);
		// Back off: try again after one cooldown window.
		const nextRunAt = now + spec.cooldownSeconds;
		await updateTaskSchedulerState(env.DB, row.id, row.last_run_at ?? now, nextRunAt, row.scheduler_state);
		return;
	}

	const value = extractMetric(result, spec.metric);
	if (value === null) {
		console.warn("[scheduler] could not extract metric", spec.metric, "from source", spec.sourceId);
		const nextRunAt = now + spec.cooldownSeconds;
		await updateTaskSchedulerState(env.DB, row.id, row.last_run_at ?? now, nextRunAt, row.scheduler_state);
		return;
	}

	// Parse previous state for 'changed' operator and prevent duplicate fires.
	const prevState: SchedulerState = row.scheduler_state
		? (() => {
				try {
					return JSON.parse(row.scheduler_state) as SchedulerState;
				} catch {
					return {};
				}
			})()
		: {};

	const previousValue = prevState.lastValue ?? null;
	const conditionMet = evaluateCondition(value, spec.op, spec.threshold, previousValue);

	// Update scheduler state (persist last observed value).
	const nextState: SchedulerState = { lastValue: value };
	const nextRunAt = now + spec.cooldownSeconds;

	if (!conditionMet) {
		await updateTaskSchedulerState(
			env.DB,
			row.id,
			row.last_run_at ?? now,
			nextRunAt,
			JSON.stringify(nextState),
		);
		return;
	}

	// Condition met — write the feed row.
	const feedMessage = renderTemplate(spec.messageTemplate, {
		value: String(value),
		threshold: spec.threshold !== undefined ? String(spec.threshold) : "",
		source: spec.sourceId,
		title: row.title,
	});

	const updateId = `upd_${nanoid(12)}`;
	await createUpdate(env.DB, row.owner, {
		id: updateId,
		topicId: row.topic_id,
		icon: "bolt",
		color: "#f59e0b",
		tone: value > (spec.threshold ?? 0) ? "up" : "down",
		title: row.title,
		time: "Just now",
		group: "今天",
		summary: feedMessage,
		body: [feedMessage],
		source: spec.sourceId,
	});

	nextState.lastTriggeredAt = now;
	await updateTaskSchedulerState(env.DB, row.id, now, nextRunAt, JSON.stringify(nextState));

	console.log("[scheduler] condition task", row.id, "fired; value=", value, "op=", spec.op);

	// Attempt Web Push (Phase 1b).
	await attemptPushForOwner(env, row.owner, {
		title: row.title,
		body: feedMessage,
	}).catch((e) => console.warn("[scheduler] push failed for owner", row.owner, String(e)));
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Extract a numeric metric from a DataSourceResult using a dot-path / bracket
 * notation string (e.g. 'items[0].price', '__count__').
 */
export function extractMetric(result: DataSourceResult, path: string): number | null {
	if (path === "__count__") return result.items.length;
	// Normalise bracket notation to dot notation: 'items[0].price' → 'items.0.price'
	const parts = path
		.replace(/\[(\d+)\]/g, ".$1")
		.split(".")
		.filter(Boolean);
	let cur: unknown = result;
	for (const p of parts) {
		if (cur == null || typeof cur !== "object") return null;
		cur = (cur as Record<string, unknown>)[p];
	}
	if (typeof cur === "number") return cur;
	if (typeof cur === "string") {
		const n = Number(cur);
		return isNaN(n) ? null : n;
	}
	return null;
}

/**
 * Evaluate a comparison condition. Returns true when the trigger should fire.
 * For 'changed', fires when value differs from previousValue (null → always fires on first run).
 */
export function evaluateCondition(
	value: number,
	op: ConditionOp,
	threshold: number | undefined,
	previousValue: number | null,
): boolean {
	switch (op) {
		case "gt":
			return threshold !== undefined && value > threshold;
		case "lt":
			return threshold !== undefined && value < threshold;
		case "gte":
			return threshold !== undefined && value >= threshold;
		case "lte":
			return threshold !== undefined && value <= threshold;
		case "changed":
			// Fires when value is different from the last observed value.
			// On first run (previousValue === null) always fires so the user sees
			// the initial state.
			return previousValue === null || value !== previousValue;
		default:
			return false;
	}
}

/**
 * Render a simple {{variable}} template string.
 * Variables: {{value}}, {{threshold}}, {{source}}, {{title}}.
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

// ---------------------------------------------------------------------------
// Web Push delivery (Phase 1b — only active when VAPID keys are configured)
// ---------------------------------------------------------------------------

interface PushMessage {
	title: string;
	body: string;
	/** Importance level of this notification. Defaults to 'normal'. */
	importance?: "low" | "normal" | "high";
}

// ---------------------------------------------------------------------------
// Notification settings helpers
// ---------------------------------------------------------------------------

/**
 * Load notification settings for a user, falling back to safe defaults when
 * no row exists (all channels on, no DND, digest disabled).
 * "anon" owners always get the default (no settings row is ever written for them).
 */
async function loadNotificationSettings(
	env: Env,
	userId: string,
): Promise<UserNotificationSettings> {
	const defaults: UserNotificationSettings = {
		emailEnabled: true,
		pushEnabled: true,
		dndStart: null,
		dndEnd: null,
		digestEnabled: false,
		digestTime: "08:00",
		importanceThreshold: "normal",
	};

	interface SettingsRow {
		email_enabled: number;
		push_enabled: number;
		dnd_start: number | null;
		dnd_end: number | null;
		digest_enabled: number;
		digest_time: string;
		importance_threshold: string;
	}

	const row = await env.DB.prepare(
		`SELECT email_enabled, push_enabled, dnd_start, dnd_end,
		        digest_enabled, digest_time, importance_threshold
		 FROM user_notification_settings WHERE user_id = ?`,
	)
		.bind(userId)
		.first<SettingsRow>();

	if (!row) return defaults;

	return {
		emailEnabled: row.email_enabled === 1,
		pushEnabled: row.push_enabled === 1,
		dndStart: row.dnd_start,
		dndEnd: row.dnd_end,
		digestEnabled: row.digest_enabled === 1,
		digestTime: row.digest_time,
		importanceThreshold: (row.importance_threshold as UserNotificationSettings["importanceThreshold"]) ?? "normal",
	};
}

/**
 * Return true when the given UTC minute-of-day (0–1439) falls inside the
 * user's do-not-disturb window. Returns false when DND is not configured.
 *
 * The window wraps midnight when dndStart > dndEnd
 * (e.g. dndStart=1320 [22:00], dndEnd=360 [06:00] covers 22:00–06:00 UTC).
 */
export function isInDnd(
	nowMinutesUtc: number,
	dndStart: number | null,
	dndEnd: number | null,
): boolean {
	if (dndStart === null || dndEnd === null) return false;
	if (dndStart <= dndEnd) {
		// Normal window: e.g. 01:00–06:00 (60–360)
		return nowMinutesUtc >= dndStart && nowMinutesUtc < dndEnd;
	}
	// Wrapping window: e.g. 22:00–06:00 (1320–360)
	return nowMinutesUtc >= dndStart || nowMinutesUtc < dndEnd;
}

/**
 * Compare two importance levels.
 * Returns true when `level` meets or exceeds `threshold`.
 */
function meetsThreshold(
	level: "low" | "normal" | "high",
	threshold: "low" | "normal" | "high",
): boolean {
	const rank: Record<string, number> = { low: 0, normal: 1, high: 2 };
	return (rank[level] ?? 1) >= (rank[threshold] ?? 1);
}

/**
 * Decide whether a push notification should be sent immediately given the
 * user's notification settings and the current UTC time.
 *
 * Rules (evaluated in order):
 * 1. push_enabled = 0  → skip.
 * 2. Inside DND window → skip (regardless of importance).
 * 3. Digest mode on AND importance below threshold → skip (will be batched later).
 * 4. Otherwise → send.
 */
export function shouldSendPushNow(
	settings: UserNotificationSettings,
	nowUnix: number,
	importance: "low" | "normal" | "high" = "normal",
): boolean {
	if (!settings.pushEnabled) return false;

	// Convert unix timestamp to UTC minutes of day.
	const nowMinutesUtc = Math.floor((nowUnix % 86400) / 60);
	if (isInDnd(nowMinutesUtc, settings.dndStart, settings.dndEnd)) return false;

	// Digest mode: low/normal importance items are held back; high always fires.
	if (settings.digestEnabled && !meetsThreshold(importance, settings.importanceThreshold)) {
		return false;
	}

	return true;
}

/**
 * Send Web Push notifications to all subscriptions for the given owner.
 * Only runs when VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY_ENC are both set.
 * Respects the user's notification settings (push toggle, DND, digest mode).
 * Expired subscriptions (HTTP 410) are automatically deleted.
 * All errors are caught here and must not propagate to the caller.
 */
async function attemptPushForOwner(env: Env, owner: string, message: PushMessage): Promise<void> {
	if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY_ENC || !env.AUTH_SECRET) {
		// Web Push not configured — silently skip (Phase 1b).
		return;
	}

	// anon users have no subscriptions and no settings row.
	if (owner === "anon") return;

	// Load the user's notification preferences and apply gating rules.
	const settings = await loadNotificationSettings(env, owner);
	const now = Math.floor(Date.now() / 1000);
	if (!shouldSendPushNow(settings, now, message.importance ?? "normal")) {
		console.log(
			"[scheduler] push skipped for owner", owner,
			"(push_enabled:", settings.pushEnabled,
			"dnd:", settings.dndStart, "-", settings.dndEnd,
			"digest:", settings.digestEnabled, "importance:", message.importance ?? "normal", ")",
		);
		return;
	}

	// Lazy-import to avoid loading vapid.ts in envs where it is not used.
	const { sendWebPush, decryptPushAuth } = await import("../push/vapid");

	interface SubRow {
		id: string;
		endpoint: string;
		p256dh: string;
		auth_enc: string;
	}
	const { results } = await env.DB.prepare(
		"SELECT id, endpoint, p256dh, auth_enc FROM push_subscriptions WHERE user_id = ?",
	)
		.bind(owner)
		.all<SubRow>();

	for (const sub of results ?? []) {
		try {
			const authPlaintext = await decryptPushAuth(sub.auth_enc, env.AUTH_SECRET);
			if (!authPlaintext) {
				console.warn("[scheduler] push sub", sub.id, "auth decrypt failed; skipping");
				continue;
			}
			const ok = await sendWebPush(
				env,
				{ endpoint: sub.endpoint, p256dh: sub.p256dh, authPlaintext },
				message,
			);
			if (!ok) {
				// 410 Gone — subscription expired; delete it.
				await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?")
					.bind(sub.id)
					.run();
				console.log("[scheduler] deleted expired push subscription", sub.id);
			}
		} catch (e) {
			console.warn("[scheduler] push delivery failed for sub", sub.id, String(e));
		}
	}
}
