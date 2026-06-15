/**
 * Business API routes.
 * NanoBee endpoints live in sibling modules (auth / bootstrap / messages /
 * tasks) and are mounted here. The original /api/users smoke-test
 * endpoints were removed in favor of the real auth system (routes/auth/).
 */

import { Hono } from "hono";
import type { Env } from "../api-worker";
import { aiSettingsRoutes } from "./ai-settings";
import { artifactRoutes } from "./artifacts";
import { authRoutes } from "./auth";
import { bootstrapRoutes } from "./bootstrap";
import { compareRoutes } from "./compare";
import { messageRoutes } from "./messages";
import { notificationSettingsRoutes } from "./notification-settings";
import { pushRoutes } from "./push";
import { researchRoutes } from "./research";
import { taskRoutes } from "./tasks";

export const apiRoutes = new Hono<{ Bindings: Env }>()
	// NanoBee app endpoints (chained for typed RPC inference)
	.route("/ai", aiSettingsRoutes)
	.route("/artifacts", artifactRoutes)
	.route("/auth", authRoutes)
	.route("/bootstrap", bootstrapRoutes)
	.route("/compare", compareRoutes)
	.route("/messages", messageRoutes)
	.route("/notifications", notificationSettingsRoutes)
	.route("/push", pushRoutes)
	.route("/research", researchRoutes)
	.route("/tasks", taskRoutes)
	// GET /api/hello — minimal RPC smoke-test endpoint
	.get("/hello", (c) => {
		const name = c.req.query("name") || "World";
		console.log("[API] GET /api/hello, name:", name);
		return c.json({
			message: `Hello, ${name}!`,
			timestamp: new Date().toISOString(),
		});
	});
