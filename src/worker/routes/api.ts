/**
 * Business API routes.
 * NanoBee endpoints live in sibling modules (bootstrap / messages / tasks /
 * updates) and are mounted here; the /api/users endpoints remain as the
 * original full-stack smoke-test example.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { CONFIG } from "../config";
import type { Env } from "../api-worker";
import { bootstrapRoutes } from "./bootstrap";
import { messageRoutes } from "./messages";
import { taskRoutes } from "./tasks";
import { updateRoutes } from "./updates";

export const apiRoutes = new Hono<{ Bindings: Env }>()
	// NanoBee app endpoints (chained for typed RPC inference)
	.route("/bootstrap", bootstrapRoutes)
	.route("/messages", messageRoutes)
	.route("/tasks", taskRoutes)
	.route("/updates", updateRoutes)
	// GET /api/hello — minimal RPC smoke-test endpoint
	.get("/hello", (c) => {
		const name = c.req.query("name") || "World";
		console.log("[API] GET /api/hello, name:", name);
		return c.json({
			message: `Hello, ${name}!`,
			timestamp: new Date().toISOString(),
		});
	})

	// GET /api/users — list users from D1
	.get("/users", async (c) => {
		console.log("[API] GET /api/users");
		try {
			const { results } = await c.env.DB.prepare(
				"SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT ?",
			)
				.bind(CONFIG.DEFAULT_LIST_LIMIT)
				.all();
			return c.json({ users: results });
		} catch (error) {
			console.error("[API] GET /api/users D1 error:", String(error));
			return c.json({ error: "Database error" }, 500);
		}
	})

	// POST /api/users — create a user in D1
	.post(
		"/users",
		zValidator(
			"json",
			z.object({
				name: z.string().min(1, "Name must not be empty").max(100, "Name too long"),
				email: z.email("Invalid email format").max(254, "Email too long"),
			}),
		),
		async (c) => {
			const data = c.req.valid("json");
			console.log("[API] POST /api/users, data:", JSON.stringify(data));
			try {
				const { meta } = await c.env.DB.prepare(
					"INSERT INTO users (name, email, created_at) VALUES (?, ?, unixepoch())",
				)
					.bind(data.name, data.email)
					.run();
				const user = await c.env.DB.prepare(
					"SELECT id, name, email, created_at FROM users WHERE id = ?",
				)
					.bind(meta.last_row_id)
					.first();
				return c.json({ user }, 201);
			} catch (error) {
				const message = String(error);
				console.error("[API] POST /api/users D1 error:", message);
				if (message.includes("UNIQUE")) {
					return c.json({ error: "Email already exists" }, 409);
				}
				return c.json({ error: "Database error" }, 500);
			}
		},
	);
