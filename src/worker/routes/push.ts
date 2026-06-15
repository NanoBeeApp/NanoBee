/**
 * /api/push — Web Push subscription management endpoints.
 *
 * Three endpoints:
 * - GET  /vapid-public-key   — returns VAPID_PUBLIC_KEY from env (no auth required)
 * - POST /subscribe          — upserts a push subscription (requires session)
 * - DELETE /subscribe        — removes a push subscription (requires session)
 *
 * The push subscription auth secret is encrypted at rest using AES-256-GCM
 * with a key derived from AUTH_SECRET (same scheme as api_key_enc, but using
 * a distinct KEY_CONTEXT of 'nanobee:push-auth:v1:' via encryptPushAuth()).
 *
 * Phase 1b: the delivery side (sendWebPush) lives in src/worker/push/vapid.ts.
 * These endpoints only store / remove subscriptions.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { nanoid } from "nanoid";
import type { Env } from "../api-worker";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";
import { encryptPushAuth } from "../push/vapid";

const subscribeSchema = z.object({
	/** The PushSubscription endpoint URL from PushManager.subscribe(). */
	endpoint: z.string().url().max(2000),
	/** Browser's P-256 DH public key in base64url encoding. */
	p256dh: z.string().min(1).max(200),
	/** Push auth secret in base64url encoding (will be encrypted before storage). */
	auth: z.string().min(1).max(100),
});

const unsubscribeSchema = z.object({
	/** The endpoint URL to remove. */
	endpoint: z.string().url().max(2000),
});

export const pushRoutes = new Hono<{ Bindings: Env }>()
	// GET /api/push/vapid-public-key — returns the VAPID public key for the
	// browser's PushManager.subscribe({ applicationServerKey: ... }) call.
	// No authentication required.
	.get("/vapid-public-key", (c) => {
		const key = c.env.VAPID_PUBLIC_KEY;
		if (!key) return c.json({ error: "Web Push not configured" }, 503);
		return c.json({ publicKey: key });
	})

	// POST /api/push/subscribe — upsert a browser push subscription.
	// Requires a valid session. The auth secret is encrypted before storage.
	.post("/subscribe", zValidator("json", subscribeSchema), async (c) => {
		const token = getSessionToken(c);
		const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const { endpoint, p256dh, auth } = c.req.valid("json");

		if (!c.env.AUTH_SECRET) {
			return c.json({ error: "Server not configured for push" }, 503);
		}

		// Encrypt the push auth secret before storage. nanoid() called here
		// inside handler scope (not at module level — Workers deploy rule).
		const authEnc = await encryptPushAuth(auth, c.env.AUTH_SECRET);
		const id = `sub_${nanoid(12)}`;

		await c.env.DB.prepare(
			`INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth_enc, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, endpoint) DO UPDATE SET
         p256dh   = excluded.p256dh,
         auth_enc = excluded.auth_enc,
         updated_at = unixepoch()`,
		)
			.bind(id, user.id, endpoint, p256dh, authEnc, c.req.header("user-agent") ?? null)
			.run();

		console.log("[API] POST /api/push/subscribe: sub", id, "for user", user.id);
		return c.json({ ok: true }, 201);
	})

	// DELETE /api/push/subscribe — remove a browser push subscription.
	// Requires a valid session.
	.delete("/subscribe", zValidator("json", unsubscribeSchema), async (c) => {
		const token = getSessionToken(c);
		const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
		if (!user) return c.json({ error: "Unauthorized" }, 401);

		const { endpoint } = c.req.valid("json");
		await c.env.DB.prepare(
			"DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?",
		)
			.bind(user.id, endpoint)
			.run();

		console.log("[API] DELETE /api/push/subscribe for user", user.id);
		return c.json({ ok: true });
	});
