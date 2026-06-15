/**
 * /api/tasks — create a task (from an AI suggestion card or the selection
 * float) and pause/resume it. Creation is idempotent on the task id so a
 * double-clicked confirm button cannot duplicate a task.
 *
 * All operations are scoped to the caller's owner bucket (signed-in user id
 * or "anon" for signed-out visitors) so tasks are never visible or mutable
 * across account boundaries.
 *
 * Optional triggerSpec field: a structured declarative rule (ScheduleTrigger
 * or ConditionTrigger) stored in the trigger_spec column and evaluated by the
 * Cloudflare cron handler without any LLM calls.
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../api-worker";
import type { TriggerSpec } from "../../types";
import { getTask, ANON_OWNER } from "../db/repo";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";
import { computeNextRunAt } from "../scheduler/engine";

/** Resolve the owner bucket: the signed-in user id, or the anon bucket. */
async function ownerOf(c: Context<{ Bindings: Env }>): Promise<string> {
	const token = getSessionToken(c);
	if (!token) return ANON_OWNER;
	const user = await getUserBySessionToken(c.env.DB, token);
	return user?.id ?? ANON_OWNER;
}

/** Zod schema for the structured trigger specification (stored in trigger_spec column). */
const triggerSpecSchema = z
	.discriminatedUnion("kind", [
		z.object({
			kind: z.literal("schedule"),
			hour: z.number().int().min(0).max(23),
			minute: z.number().int().min(0).max(59),
			label: z.string().max(100),
			message: z.string().max(500).optional(),
		}),
		z.object({
			kind: z.literal("condition"),
			sourceId: z.string().max(100),
			metric: z.string().max(200),
			op: z.enum(["gt", "lt", "gte", "lte", "changed"]),
			threshold: z.number().optional(),
			cooldownSeconds: z.number().int().min(60).max(86400 * 7).default(3600),
			messageTemplate: z.string().max(500),
			params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
		}),
	])
	.optional();

const taskSchema = z.object({
	id: z.string().regex(/^[a-z]+_[A-Za-z0-9_-]{4,40}$/, "Invalid task id"),
	topicId: z.string().min(1).max(40),
	title: z.string().min(1).max(100),
	iconColor: z.string().max(20),
	triggerType: z.enum(["condition", "schedule"]),
	trigger: z.string().max(200),
	last: z.string().max(50),
	next: z.string().max(50),
	result: z.string().max(500).optional(),
	resultTone: z.enum(["up", "down", "info"]).optional(),
	desc: z.string().max(500).optional(),
	config: z
		.array(z.object({ icon: z.enum(["clock", "bolt"]), label: z.string().max(50) }))
		.optional(),
	kind: z.enum(["oneoff", "schedule", "condition", "batch"]).optional(),
	runState: z.enum(["running", "failed", "done"]).optional(),
	batch: z
		.object({
			total: z.number().int().nonnegative(),
			done: z.number().int().nonnegative(),
			failed: z.number().int().nonnegative(),
			subtasks: z
				.array(
					z.object({
						id: z.string().max(60),
						input: z.string().max(200),
						status: z.enum(["queued", "running", "success", "failed"]),
						result: z.string().max(500).optional(),
					}),
				)
				.max(2000),
		})
		.optional(),
	history: z
		.array(
			z.object({
				time: z.string().max(50),
				status: z.enum(["success", "failed"]),
				summary: z.string().max(500),
				durationMs: z.number().optional(),
			}),
		)
		.max(100)
		.optional(),
	/** Structured trigger spec for server-side cron evaluation (no LLM). */
	triggerSpec: triggerSpecSchema,
});

export const taskRoutes = new Hono<{ Bindings: Env }>()
	// POST /api/tasks — create from a suggestion payload (idempotent)
	.post("/", zValidator("json", taskSchema), async (c) => {
		const data = c.req.valid("json");
		console.log("[API] POST /api/tasks, id:", data.id);
		try {
			const owner = await ownerOf(c);
			// triggerSpec is stored in its own column; strip it from the display payload.
			const { id, topicId, title, triggerSpec, ...rest } = data;

			// Compute the initial next_run_at for schedule tasks so the cron
			// handler picks them up on the next tick. MUST be inside handler scope
			// (no top-level Date.now() — violates Workers deploy validation).
			let nextRunAt: number | null = null;
			if (triggerSpec?.kind === "schedule") {
				nextRunAt = computeNextRunAt(triggerSpec, Math.floor(Date.now() / 1000));
			} else if (triggerSpec?.kind === "condition") {
				// Condition tasks have no fixed next_run_at — cooldown governs re-evaluation.
				// Set to now so the first cron tick evaluates them immediately.
				nextRunAt = Math.floor(Date.now() / 1000);
			}

			await c.env.DB.prepare(
				`INSERT OR IGNORE INTO tasks
           (id, owner, topic_id, title, status, payload, trigger_spec, next_run_at)
         VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
			)
				.bind(
					id,
					owner,
					topicId,
					title,
					JSON.stringify(rest),
					triggerSpec ? JSON.stringify(triggerSpec) : null,
					nextRunAt,
				)
				.run();
			const task = await getTask(c.env.DB, id, owner);
			return c.json({ task }, 201);
		} catch (error) {
			console.error("[API] POST /api/tasks D1 error:", String(error));
			return c.json({ error: "Database error" }, 500);
		}
	})

	// POST /api/tasks/:id/toggle — pause / resume
	.post("/:id/toggle", async (c) => {
		const id = c.req.param("id");
		console.log("[API] POST /api/tasks/:id/toggle, id:", id);
		try {
			const owner = await ownerOf(c);
			const task = await getTask(c.env.DB, id, owner);
			if (!task) return c.json({ error: "Task not found" }, 404);

			const status = task.status === "active" ? "paused" : "active";
			const next =
				status === "paused" ? "已暂停" : task.triggerType === "schedule" ? "明天" : "监控中";
			// Preserve every payload field (kind / batch / history / config / …);
			// only `status` (a real column) and `next` change on a toggle.
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { id: _id, topicId: _topic, title: _title, status: _status, ...rest } = task;
			const payload = { ...rest, next };
			await c.env.DB.prepare("UPDATE tasks SET status = ?, payload = ? WHERE id = ? AND owner = ?")
				.bind(status, JSON.stringify(payload), id, owner)
				.run();

			// For tasks with a trigger_spec, reset or clear next_run_at.
			// MUST be inside handler scope (no top-level Date.now()).
			const specRow = await c.env.DB.prepare(
				"SELECT trigger_spec FROM tasks WHERE id = ? AND owner = ?",
			)
				.bind(id, owner)
				.first<{ trigger_spec: string | null }>();

			if (specRow?.trigger_spec) {
				const spec = JSON.parse(specRow.trigger_spec) as TriggerSpec;
				if (status === "paused") {
					// Clear next_run_at so the cron handler skips this task while paused.
					await c.env.DB.prepare("UPDATE tasks SET next_run_at = NULL WHERE id = ? AND owner = ?")
						.bind(id, owner)
						.run();
				} else if (status === "active" && spec.kind === "schedule") {
					// Re-arm: compute the next wall-clock fire time.
					const nextRunAt = computeNextRunAt(spec, Math.floor(Date.now() / 1000));
					await c.env.DB.prepare(
						"UPDATE tasks SET next_run_at = ? WHERE id = ? AND owner = ?",
					)
						.bind(nextRunAt, id, owner)
						.run();
				} else if (status === "active" && spec.kind === "condition") {
					// Condition task resumed: set next_run_at to now so first cron tick evaluates immediately.
					await c.env.DB.prepare(
						"UPDATE tasks SET next_run_at = ? WHERE id = ? AND owner = ?",
					)
						.bind(Math.floor(Date.now() / 1000), id, owner)
						.run();
				}
			}

			return c.json({ task: { ...task, status, next } });
		} catch (error) {
			console.error("[API] POST /api/tasks/:id/toggle D1 error:", String(error));
			return c.json({ error: "Database error" }, 500);
		}
	})

	// DELETE /api/tasks/:id — remove a task (full soft-delete / trash is a later concern)
	.delete("/:id", async (c) => {
		const id = c.req.param("id");
		console.log("[API] DELETE /api/tasks/:id, id:", id);
		try {
			const owner = await ownerOf(c);
			const task = await getTask(c.env.DB, id, owner);
			if (!task) return c.json({ error: "Task not found" }, 404);
			await c.env.DB.prepare("DELETE FROM tasks WHERE id = ? AND owner = ?").bind(id, owner).run();
			return c.json({ ok: true });
		} catch (error) {
			console.error("[API] DELETE /api/tasks/:id D1 error:", String(error));
			return c.json({ error: "Database error" }, 500);
		}
	});
