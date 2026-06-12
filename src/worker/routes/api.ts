/**
 * Business API routes.
 * NanoBee endpoints live in sibling modules (auth / bootstrap / messages /
 * tasks / updates) and are mounted here. The original /api/users smoke-test
 * endpoints were removed in favor of the real auth system (routes/auth/).
 */

import { Hono } from "hono";
import type { Env } from "../api-worker";
import { authRoutes } from "./auth";
import { bootstrapRoutes } from "./bootstrap";
import { messageRoutes } from "./messages";
import { taskRoutes } from "./tasks";
import { updateRoutes } from "./updates";

export const apiRoutes = new Hono<{ Bindings: Env }>()
	// NanoBee app endpoints (chained for typed RPC inference)
	.route("/auth", authRoutes)
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
	});
