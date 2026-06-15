/**
 * /api/tasks — create a task (from an AI suggestion card or the selection
 * float) and pause/resume it. Creation is idempotent on the task id so a
 * double-clicked confirm button cannot duplicate a task.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../api-worker";
import { getTask } from "../db/repo";

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
});

export const taskRoutes = new Hono<{ Bindings: Env }>()
	// POST /api/tasks — create from a suggestion payload (idempotent)
	.post("/", zValidator("json", taskSchema), async (c) => {
		const data = c.req.valid("json");
		console.log("[API] POST /api/tasks, id:", data.id);
		try {
			const { id, topicId, title, ...rest } = data;
			await c.env.DB.prepare(
				"INSERT OR IGNORE INTO tasks (id, topic_id, title, status, payload) VALUES (?, ?, ?, 'active', ?)",
			)
				.bind(id, topicId, title, JSON.stringify(rest))
				.run();
			const task = await getTask(c.env.DB, id);
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
			const task = await getTask(c.env.DB, id);
			if (!task) return c.json({ error: "Task not found" }, 404);

			const status = task.status === "active" ? "paused" : "active";
			const next =
				status === "paused" ? "已暂停" : task.triggerType === "schedule" ? "明天" : "监控中";
			const payload = {
				iconColor: task.iconColor,
				triggerType: task.triggerType,
				trigger: task.trigger,
				last: task.last,
				next,
				result: task.result,
				resultTone: task.resultTone,
				desc: task.desc,
				config: task.config,
			};
			await c.env.DB.prepare("UPDATE tasks SET status = ?, payload = ? WHERE id = ?")
				.bind(status, JSON.stringify(payload), id)
				.run();
			return c.json({ task: { ...task, status, next } });
		} catch (error) {
			console.error("[API] POST /api/tasks/:id/toggle D1 error:", String(error));
			return c.json({ error: "Database error" }, 500);
		}
	});
