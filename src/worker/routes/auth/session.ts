/**
 * Session routes: GET /me (current user or null) and POST /logout.
 */

import { Hono } from "hono";
import type { Env } from "../../api-worker";
import { clearSessionCookie, getSessionToken } from "../../auth/cookies";
import { deleteSessionByToken, getUserBySessionToken } from "../../auth/store";

export const sessionRoutes = new Hono<{ Bindings: Env }>()
	// GET /api/auth/me — resolve the cookie session to a user (or null)
	.get("/me", async (c) => {
		const token = getSessionToken(c);
		if (!token) return c.json({ user: null });
		const user = await getUserBySessionToken(c.env.DB, token);
		if (!user) {
			clearSessionCookie(c);
			return c.json({ user: null });
		}
		return c.json({
			user: { id: user.id, email: user.email, name: user.name, image: user.image },
		});
	})

	// POST /api/auth/logout — drop the server session + cookie
	.post("/logout", async (c) => {
		const token = getSessionToken(c);
		if (token) await deleteSessionByToken(c.env.DB, token);
		clearSessionCookie(c);
		console.log("[AUTH] POST /logout");
		return c.json({ ok: true });
	});
