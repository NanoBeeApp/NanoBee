/**
 * GET  /api/onboarding      — returns { done: boolean } for the current user.
 * POST /api/onboarding/done — marks the onboarding flag as complete (done=1).
 *
 * Only meaningful for authenticated users.  Anon visitors and users who
 * already have the flag set both return { done: true } so the flow is never
 * shown to them.
 *
 * Change history:
 *   2026-06-15  Initial implementation (migration 0017).
 */

import { Hono } from "hono";
import type { Env } from "../api-worker";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";

export const onboardingRoutes = new Hono<{ Bindings: Env }>()
	/** GET /api/onboarding — check whether the signed-in user has completed onboarding. */
	.get("/", async (c) => {
		const token = getSessionToken(c);
		if (!token) return c.json({ done: true }); // anon visitors skip the flow

		const user = await getUserBySessionToken(c.env.DB, token);
		if (!user) return c.json({ done: true });

		const row = await c.env.DB
			.prepare("SELECT onboarding_done FROM users WHERE id = ?")
			.bind(user.id)
			.first<{ onboarding_done: number }>();

		return c.json({ done: (row?.onboarding_done ?? 0) === 1 });
	})

	/** POST /api/onboarding/done — mark onboarding as complete. */
	.post("/done", async (c) => {
		const token = getSessionToken(c);
		if (!token) return c.json({ ok: true }); // no-op for anon

		const user = await getUserBySessionToken(c.env.DB, token);
		if (!user) return c.json({ ok: true });

		await c.env.DB
			.prepare("UPDATE users SET onboarding_done = 1, updated_at = unixepoch() WHERE id = ?")
			.bind(user.id)
			.run();

		console.log("[onboarding] marked done for user", user.id);
		return c.json({ ok: true });
	});
