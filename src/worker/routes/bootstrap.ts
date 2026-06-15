/**
 * GET /api/bootstrap — the app's initial state in a single round-trip:
 * sidebar chats, full conversations, tasks, Today-page updates, and the
 * onboarding completion flag for signed-in users.
 *
 * Results are scoped to the signed-in user's owner bucket, or the "anon"
 * bucket for signed-out visitors. On the first anon request the bucket is
 * lazily seeded with demo content so visitors see a meaningful app without
 * needing to sign up first.
 *
 * Change history:
 *   2026-06-15  Added `onboardingDone` to the response (migration 0017).
 *               Also auto-marks existing users with tasks as done so the
 *               onboarding does not reappear for active users after the
 *               migration is applied.
 */

import { Hono } from "hono";
import type { Context } from "hono";
import type { Env } from "../api-worker";
import { listChats, listConversations, listTasks, listUpdates, ANON_OWNER } from "../db/repo";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";
import { ensureAnonSeed } from "../db/seed";

interface UserOnboardingRow {
	onboarding_done: number;
}

/** Resolve the owner bucket AND the signed-in user id (null for anon). */
async function resolveOwner(
	c: Context<{ Bindings: Env }>,
): Promise<{ owner: string; userId: string | null }> {
	const token = getSessionToken(c);
	if (!token) return { owner: ANON_OWNER, userId: null };
	const user = await getUserBySessionToken(c.env.DB, token);
	if (!user) return { owner: ANON_OWNER, userId: null };
	return { owner: user.id, userId: user.id };
}

export const bootstrapRoutes = new Hono<{ Bindings: Env }>().get("/", async (c) => {
	console.log("[API] GET /api/bootstrap");
	try {
		const { owner, userId } = await resolveOwner(c);

		// Lazily initialize anon seed data on first request for the anon bucket.
		if (owner === ANON_OWNER) await ensureAnonSeed(c.env.DB);

		const [chats, conversations, tasks, updates] = await Promise.all([
			listChats(c.env.DB, owner),
			listConversations(c.env.DB, owner),
			listTasks(c.env.DB, owner),
			listUpdates(c.env.DB, owner),
		]);

		// Resolve onboarding flag: anon visitors and users who already have tasks
		// are considered "done" so the flow does not interrupt them.
		let onboardingDone = true; // default: skip for anon
		if (userId) {
			const row = await c.env.DB
				.prepare("SELECT onboarding_done FROM users WHERE id = ?")
				.bind(userId)
				.first<UserOnboardingRow>();

			const alreadyDone = (row?.onboarding_done ?? 0) === 1;
			const hasTasks = tasks.length > 0;

			if (!alreadyDone && hasTasks) {
				// Silently auto-complete for users who already have tasks (e.g. after
				// migration 0017 is applied to an existing database).
				await c.env.DB
					.prepare("UPDATE users SET onboarding_done = 1, updated_at = unixepoch() WHERE id = ?")
					.bind(userId)
					.run();
				onboardingDone = true;
			} else {
				onboardingDone = alreadyDone;
			}
		}

		return c.json({ chats, conversations, tasks, updates, onboardingDone });
	} catch (error) {
		console.error("[API] GET /api/bootstrap D1 error:", String(error));
		return c.json({ error: "Database error" }, 500);
	}
});
