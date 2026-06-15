/**
 * Account management routes (all require an active session):
 *   POST   /api/auth/forgot-password   — send a 6-digit reset code
 *   POST   /api/auth/reset-password    — verify code, set new password
 *   PATCH  /api/auth/account/name      — change display name
 *   POST   /api/auth/account/password  — change password (current required)
 *   GET    /api/auth/sessions          — list active sessions
 *   POST   /api/auth/sessions/revoke   — revoke one or all-others sessions
 *   GET    /api/auth/export            — JSON dump of all user data
 *   DELETE /api/auth/account           — permanently delete the account
 *
 * Error codes are stable strings mapped to copy on the frontend.
 * Reset and forgot-password do NOT reveal whether the email is registered.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { CONFIG } from "../../config";
import type { Env } from "../../api-worker";
import { hashPassword, randomEmailCode, verifyPassword } from "../../auth/crypto";
import { sendPasswordResetCode } from "../../auth/email";
import { clearSessionCookie, getSessionToken } from "../../auth/cookies";
import {
	consumeEmailCode,
	countRecentCodesForPurpose,
	deleteOtherSessions,
	deleteSessionById,
	findUserByEmail,
	getUserAndSessionId,
	getUserRowForExport,
	listUserSessions,
	saveEmailCodeWithPurpose,
	updateUserName,
	updateUserPassword,
} from "../../auth/store";

const emailSchema = z.email("Invalid email format").max(254).toLowerCase();
const passwordSchema = z
	.string()
	.min(CONFIG.AUTH.PASSWORD_MIN_LENGTH, "Password too short")
	.max(CONFIG.AUTH.PASSWORD_MAX_LENGTH, "Password too long");

export const accountRoutes = new Hono<{ Bindings: Env }>()

	// -----------------------------------------------------------------------
	// POST /api/auth/forgot-password — send a reset code (no login required)
	// -----------------------------------------------------------------------
	.post(
		"/forgot-password",
		zValidator("json", z.object({ email: emailSchema })),
		async (c) => {
			const { email } = c.req.valid("json");
			console.log(`[AUTH] POST /forgot-password email=${email}`);

			// Always return ok — do not reveal whether the address is registered.
			const user = await findUserByEmail(c.env.DB, email);
			if (!user || !user.emailVerified) {
				// Deliberate no-op with a success-shaped response.
				return c.json({ ok: true });
			}

			// Rate limit: same hourly cap as verify codes, per-purpose bucket.
			const recent = await countRecentCodesForPurpose(c.env.DB, email, "reset");
			if (recent >= CONFIG.AUTH.EMAIL_CODE_HOURLY_LIMIT) {
				// Don't expose the rate-limit reason (would confirm the address exists).
				return c.json({ ok: true });
			}

			const code = randomEmailCode();
			await saveEmailCodeWithPurpose(c.env.DB, email, code, "reset");
			const sent = await sendPasswordResetCode(c.env, email, code);
			if (!sent) {
				// Delivery failure is the only error we surface (it doesn't
				// reveal registration status).
				return c.json({ error: "email_send_failed" }, 502);
			}
			return c.json({ ok: true });
		},
	)

	// -----------------------------------------------------------------------
	// POST /api/auth/reset-password — verify code, set new password
	// -----------------------------------------------------------------------
	.post(
		"/reset-password",
		zValidator(
			"json",
			z.object({
				email: emailSchema,
				code: z.string().regex(/^\d{6}$/),
				newPassword: passwordSchema,
			}),
		),
		async (c) => {
			const { email, code, newPassword } = c.req.valid("json");
			console.log(`[AUTH] POST /reset-password email=${email}`);

			const user = await findUserByEmail(c.env.DB, email);
			// Invalid-code response for all negative cases (no account, wrong code,
			// expired) — leaking "email not found" lets attackers enumerate users.
			if (!user || !user.emailVerified) {
				return c.json({ error: "invalid_code" }, 400);
			}

			const valid = await consumeEmailCode(c.env.DB, email, code, "reset");
			if (!valid) return c.json({ error: "invalid_code" }, 400);

			const passwordHash = await hashPassword(newPassword);
			// Invalidate ALL sessions — user must log in fresh after a reset.
			await updateUserPassword(c.env.DB, user.id, passwordHash, null);

			console.log(`[AUTH] password reset for user=${user.id}`);
			return c.json({ ok: true });
		},
	)

	// -----------------------------------------------------------------------
	// PATCH /api/auth/account/name — change display name (login required)
	// -----------------------------------------------------------------------
	.patch(
		"/account/name",
		zValidator("json", z.object({ name: z.string().trim().min(1).max(100) })),
		async (c) => {
			const token = getSessionToken(c);
			const resolved = token ? await getUserAndSessionId(c.env.DB, token) : null;
			if (!resolved) return c.json({ error: "Unauthorized" }, 401);

			const { name } = c.req.valid("json");
			await updateUserName(c.env.DB, resolved.user.id, name);
			console.log(`[AUTH] name updated for user=${resolved.user.id}`);
			return c.json({ ok: true, name });
		},
	)

	// -----------------------------------------------------------------------
	// POST /api/auth/account/password — change password (current required)
	// -----------------------------------------------------------------------
	.post(
		"/account/password",
		zValidator(
			"json",
			z.object({
				currentPassword: z.string().min(1).max(CONFIG.AUTH.PASSWORD_MAX_LENGTH),
				newPassword: passwordSchema,
			}),
		),
		async (c) => {
			const token = getSessionToken(c);
			const resolved = token ? await getUserAndSessionId(c.env.DB, token) : null;
			if (!resolved) return c.json({ error: "Unauthorized" }, 401);

			const { currentPassword, newPassword } = c.req.valid("json");

			// Must re-fetch the full row to get the password hash.
			const fullUser = await findUserByEmail(c.env.DB, resolved.user.email);
			if (!fullUser?.passwordHash) {
				// OAuth-only account has no password to change against.
				return c.json({ error: "no_password_set" }, 400);
			}

			const ok = await verifyPassword(currentPassword, fullUser.passwordHash);
			if (!ok) return c.json({ error: "invalid_credentials" }, 401);

			const newHash = await hashPassword(newPassword);
			// Keep the current session; revoke all others for security.
			await updateUserPassword(c.env.DB, resolved.user.id, newHash, resolved.sessionId);
			console.log(`[AUTH] password changed for user=${resolved.user.id}`);
			return c.json({ ok: true });
		},
	)

	// -----------------------------------------------------------------------
	// GET /api/auth/sessions — list active sessions (login required)
	// -----------------------------------------------------------------------
	.get("/sessions", async (c) => {
		const token = getSessionToken(c);
		const resolved = token ? await getUserAndSessionId(c.env.DB, token) : null;
		if (!resolved) return c.json({ error: "Unauthorized" }, 401);

		const sessions = await listUserSessions(c.env.DB, resolved.user.id);
		const currentId = resolved.sessionId;
		return c.json({
			sessions: sessions.map((s) => ({
				id: s.id,
				createdAt: s.createdAt,
				lastSeenAt: s.lastSeenAt,
				expiresAt: s.expiresAt,
				ip: s.ip,
				userAgent: s.userAgent,
				current: s.id === currentId,
			})),
		});
	})

	// -----------------------------------------------------------------------
	// POST /api/auth/sessions/revoke — revoke a session (login required)
	// -----------------------------------------------------------------------
	.post(
		"/sessions/revoke",
		zValidator(
			"json",
			z.object({
				// sessionId: a specific hashed session id to revoke
				// mode: 'others' revokes all except the current one
				sessionId: z.string().optional(),
				mode: z.enum(["one", "others"]).default("one"),
			}),
		),
		async (c) => {
			const token = getSessionToken(c);
			const resolved = token ? await getUserAndSessionId(c.env.DB, token) : null;
			if (!resolved) return c.json({ error: "Unauthorized" }, 401);

			const { sessionId, mode } = c.req.valid("json");

			if (mode === "others") {
				await deleteOtherSessions(c.env.DB, resolved.user.id, resolved.sessionId);
				console.log(`[AUTH] revoked all other sessions for user=${resolved.user.id}`);
			} else {
				if (!sessionId) return c.json({ error: "session_id_required" }, 400);
				// Prevent revoking the current session via this endpoint
				// (use /logout for that).
				if (sessionId === resolved.sessionId) {
					return c.json({ error: "cannot_revoke_current" }, 400);
				}
				await deleteSessionById(c.env.DB, sessionId, resolved.user.id);
				console.log(`[AUTH] revoked session=${sessionId} for user=${resolved.user.id}`);
			}

			return c.json({ ok: true });
		},
	)

	// -----------------------------------------------------------------------
	// GET /api/auth/export — full user data export (login required)
	// -----------------------------------------------------------------------
	.get("/export", async (c) => {
		const token = getSessionToken(c);
		const resolved = token ? await getUserAndSessionId(c.env.DB, token) : null;
		if (!resolved) return c.json({ error: "Unauthorized" }, 401);

		const userId = resolved.user.id;
		const db = c.env.DB;

		// Fetch all data in parallel for speed.
		const [
			userRow,
			chatsResult,
			tasksResult,
			updatesResult,
			researchResult,
			artifactsResult,
			aiSettingsResult,
			providerKeysResult,
		] = await Promise.all([
			getUserRowForExport(db, userId),
			db.prepare("SELECT * FROM chats WHERE owner = ?").bind(userId).all(),
			db.prepare("SELECT * FROM tasks WHERE owner = ?").bind(userId).all(),
			db.prepare("SELECT * FROM updates WHERE owner = ?").bind(userId).all(),
			db.prepare("SELECT id, title, created_at, updated_at FROM research_projects WHERE owner = ?")
				.bind(userId).all(),
			db.prepare("SELECT id, title, created_at, updated_at FROM artifacts WHERE owner = ?")
				.bind(userId).all(),
			db.prepare("SELECT provider, base_url, model, web_search_provider, created_at, updated_at FROM user_ai_settings WHERE user_id = ?")
				.bind(userId).first(),
			db.prepare("SELECT provider FROM user_provider_keys WHERE user_id = ?")
				.bind(userId).all(),
		]);

		// Fetch messages for each chat (may be large — included for completeness).
		const chats = chatsResult.results ?? [];
		const messages: Record<string, unknown[]> = {};
		if (chats.length > 0) {
			// Batch up to 50 chats (avoids D1 batch size limits in practice).
			const chatIds = chats.map((ch) => (ch as { id: string }).id);
			const chunkSize = 50;
			for (let i = 0; i < chatIds.length; i += chunkSize) {
				const chunk = chatIds.slice(i, i + chunkSize);
				const placeholders = chunk.map(() => "?").join(",");
				const rows = await db
					.prepare(`SELECT * FROM messages WHERE chat_id IN (${placeholders}) ORDER BY created_at ASC`)
					.bind(...chunk)
					.all();
				for (const row of rows.results ?? []) {
					const r = row as { chat_id: string };
					if (!messages[r.chat_id]) messages[r.chat_id] = [];
					messages[r.chat_id].push(row);
				}
			}
		}

		const exportPayload = {
			exportedAt: new Date().toISOString(),
			account: userRow
				? {
						id: userRow.id,
						email: userRow.email,
						name: userRow.name,
						image: userRow.image,
						createdAt: userRow.created_at,
					}
				: null,
			chats: chats.map((ch) => ({
				...(ch as object),
				messages: messages[(ch as { id: string }).id] ?? [],
			})),
			tasks: tasksResult.results ?? [],
			updates: updatesResult.results ?? [],
			research: researchResult.results ?? [],
			artifacts: artifactsResult.results ?? [],
			aiSettings: aiSettingsResult ?? null,
			// Only expose the provider names, never the encrypted keys.
			savedProviders: (providerKeysResult.results ?? []).map(
				(r) => (r as { provider: string }).provider,
			),
		};

		console.log(`[AUTH] data export for user=${userId}`);
		return new Response(JSON.stringify(exportPayload, null, 2), {
			headers: {
				"Content-Type": "application/json",
				"Content-Disposition": `attachment; filename="nanobee-export-${userId}.json"`,
			},
		});
	})

	// -----------------------------------------------------------------------
	// DELETE /api/auth/account — permanently delete the account (login req)
	// -----------------------------------------------------------------------
	.delete(
		"/account",
		zValidator(
			"json",
			z.object({
				// Require the user to type "DELETE" as explicit confirmation.
				confirm: z.literal("DELETE"),
			}),
		),
		async (c) => {
			const token = getSessionToken(c);
			const resolved = token ? await getUserAndSessionId(c.env.DB, token) : null;
			if (!resolved) return c.json({ error: "Unauthorized" }, 401);

			const userId = resolved.user.id;
			const db = c.env.DB;

			console.log(`[AUTH] DELETE /account for user=${userId}`);

			// Purge all owner-scoped data in dependency order.
			// All tables have ON DELETE CASCADE from users, but we delete explicitly
			// to be intentional and auditable (and to support future self-hosting
			// targets that may lack cascade support).
			await db.batch([
				// Messages first (foreign key to chats)
				db.prepare("DELETE FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE owner = ?)").bind(userId),
				// Owner-scoped content
				db.prepare("DELETE FROM chats WHERE owner = ?").bind(userId),
				db.prepare("DELETE FROM tasks WHERE owner = ?").bind(userId),
				db.prepare("DELETE FROM updates WHERE owner = ?").bind(userId),
				db.prepare("DELETE FROM research_projects WHERE owner = ?").bind(userId),
				db.prepare("DELETE FROM artifacts WHERE owner = ?").bind(userId),
				// Auth & settings
				db.prepare("DELETE FROM user_ai_settings WHERE user_id = ?").bind(userId),
				db.prepare("DELETE FROM user_provider_keys WHERE user_id = ?").bind(userId),
				db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").bind(userId),
				db.prepare("DELETE FROM user_notification_settings WHERE user_id = ?").bind(userId),
				db.prepare("DELETE FROM auth_email_codes WHERE email = (SELECT email FROM users WHERE id = ?)").bind(userId),
				db.prepare("DELETE FROM auth_sessions WHERE user_id = ?").bind(userId),
				db.prepare("DELETE FROM auth_accounts WHERE user_id = ?").bind(userId),
				// Finally the user row (cascade would handle most of the above, but
				// explicit deletes are safer across environments).
				db.prepare("DELETE FROM users WHERE id = ?").bind(userId),
			]);

			clearSessionCookie(c);
			console.log(`[AUTH] account deleted user=${userId}`);
			return c.json({ ok: true });
		},
	);
