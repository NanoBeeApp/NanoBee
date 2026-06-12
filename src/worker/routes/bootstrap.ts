/**
 * GET /api/bootstrap — the app's initial state in a single round-trip:
 * sidebar chats, full conversations, tasks and Today-page updates.
 * When SEED_DEMO_DATA="1" (local dev only), seeds the demo data on first
 * contact with an empty database; deployed environments start empty.
 */

import { Hono } from "hono";
import type { Env } from "../api-worker";
import { ensureSeeded } from "../db/seed";
import { listChats, listConversations, listTasks, listUpdates } from "../db/repo";

export const bootstrapRoutes = new Hono<{ Bindings: Env }>().get("/", async (c) => {
	console.log("[API] GET /api/bootstrap");
	try {
		await ensureSeeded(c.env);
		const [chats, conversations, tasks, updates] = await Promise.all([
			listChats(c.env.DB),
			listConversations(c.env.DB),
			listTasks(c.env.DB),
			listUpdates(c.env.DB),
		]);
		return c.json({ chats, conversations, tasks, updates });
	} catch (error) {
		console.error("[API] GET /api/bootstrap D1 error:", String(error));
		return c.json({ error: "Database error" }, 500);
	}
});
