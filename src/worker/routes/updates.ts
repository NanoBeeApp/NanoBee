/**
 * /api/updates — read-state persistence for the Today page and the
 * notification bell (mark one item read/unread, mark everything read).
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../api-worker";
import { ensureSeeded } from "../db/seed";

export const updateRoutes = new Hono<{ Bindings: Env }>()
	// POST /api/updates/read-all — mark every update as read
	.post("/read-all", async (c) => {
		console.log("[API] POST /api/updates/read-all");
		try {
			await ensureSeeded(c.env);
			await c.env.DB.prepare("UPDATE updates SET unread = 0").run();
			return c.json({ ok: true });
		} catch (error) {
			console.error("[API] POST /api/updates/read-all D1 error:", String(error));
			return c.json({ error: "Database error" }, 500);
		}
	})

	// POST /api/updates/:id/read — set one update's read flag
	.post(
		"/:id/read",
		zValidator("json", z.object({ read: z.boolean() })),
		async (c) => {
			const id = c.req.param("id");
			const { read } = c.req.valid("json");
			console.log("[API] POST /api/updates/:id/read, id:", id, "read:", read);
			try {
				await ensureSeeded(c.env);
				const { meta } = await c.env.DB.prepare(
					"UPDATE updates SET unread = ? WHERE id = ?",
				)
					.bind(read ? 0 : 1, id)
					.run();
				if (meta.changes === 0) return c.json({ error: "Update not found" }, 404);
				return c.json({ ok: true });
			} catch (error) {
				console.error("[API] POST /api/updates/:id/read D1 error:", String(error));
				return c.json({ error: "Database error" }, 500);
			}
		},
	);
