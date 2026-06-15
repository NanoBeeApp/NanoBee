/**
 * GET /api/bootstrap — the app's initial state in a single round-trip:
 * sidebar chats, full conversations, tasks and Today-page updates.
 *
 * Results are scoped to the signed-in user's owner bucket, or the "anon"
 * bucket for signed-out visitors. On the first anon request the bucket is
 * lazily seeded with demo content so visitors see a meaningful app without
 * needing to sign up first.
 */

import { Hono } from "hono";
import type { Context } from "hono";
import type { Env } from "../api-worker";
import { listChats, listConversations, listTasks, listUpdates, ANON_OWNER } from "../db/repo";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";
import { ensureAnonSeed } from "../db/seed";

/** Resolve the owner bucket: the signed-in user id, or the anon bucket. */
async function ownerOf(c: Context<{ Bindings: Env }>): Promise<string> {
	const token = getSessionToken(c);
	if (!token) return ANON_OWNER;
	const user = await getUserBySessionToken(c.env.DB, token);
	return user?.id ?? ANON_OWNER;
}

export const bootstrapRoutes = new Hono<{ Bindings: Env }>().get("/", async (c) => {
	console.log("[API] GET /api/bootstrap");
	try {
		const owner = await ownerOf(c);
		// Lazily initialize anon seed data on first request for the anon bucket.
		if (owner === ANON_OWNER) await ensureAnonSeed(c.env.DB);
		const [chats, conversations, tasks, updates] = await Promise.all([
			listChats(c.env.DB, owner),
			listConversations(c.env.DB, owner),
			listTasks(c.env.DB, owner),
			listUpdates(c.env.DB, owner),
		]);
		return c.json({ chats, conversations, tasks, updates });
	} catch (error) {
		console.error("[API] GET /api/bootstrap D1 error:", String(error));
		return c.json({ error: "Database error" }, 500);
	}
});
