/**
 * GET /api/chats/:id/messages — cursor-based older-message loading for one chat.
 *
 * Accepts:
 *   ?before=<cursor>  opaque pagination cursor (format: "<created_at>_<id>")
 *                     produced by the bootstrap response's `oldestCursor` field.
 *   ?limit=<n>        page size (default 30, max 100)
 *
 * Returns:
 *   { messages: ChatMessage[], hasMore: boolean, oldestCursor: string | null }
 *
 * Owner-scoped: only returns messages that belong to the authenticated user's
 * owner bucket. Anon visitors receive their anon-bucket messages.
 *
 * Change history:
 *   2026-06-15  Created as part of message pagination (P3).
 *   2026-06-15  Switched cursor from rowid (integer) to opaque "<created_at>_<id>"
 *               string so the index can use real columns (rowid cannot be indexed).
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../api-worker";
import { listMessagesPage, decodeCursor, ANON_OWNER, BOOTSTRAP_MSG_LIMIT } from "../db/repo";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";

const querySchema = z.object({
	before: z.string().min(1, "before must be a non-empty cursor string").refine(
		(v) => decodeCursor(v) !== null,
		"before must be a valid pagination cursor (format: <epoch>_<id>)",
	),
	limit: z
		.string()
		.regex(/^\d+$/)
		.transform(Number)
		.refine((n) => n >= 1 && n <= 100, "limit must be 1–100")
		.optional(),
});

export const chatMessageRoutes = new Hono<{ Bindings: Env }>().get(
	"/:id/messages",
	zValidator("query", querySchema),
	async (c) => {
		const chatId = c.req.param("id");
		const { before, limit: rawLimit } = c.req.valid("query");
		const limit = rawLimit ?? BOOTSTRAP_MSG_LIMIT;

		console.log(
			`[API] GET /api/chats/${chatId}/messages before=${before} limit=${limit}`,
		);

		// Resolve owner bucket (mirrors bootstrap.ts pattern).
		const token = getSessionToken(c);
		const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
		const owner = user?.id ?? ANON_OWNER;

		try {
			const result = await listMessagesPage(c.env.DB, chatId, owner, before, limit);
			return c.json(result);
		} catch (error) {
			console.error(
				`[API] GET /api/chats/${chatId}/messages D1 error:`,
				String(error),
			);
			return c.json({ error: "Database error" }, 500);
		}
	},
);
