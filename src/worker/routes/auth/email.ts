/**
 * Email + password auth routes:
 * register → email verification code → verify-email (creates session),
 * plus login and resend-code. All bodies are zod-validated.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { CONFIG } from "../../config";
import type { Env } from "../../api-worker";
import { hashPassword, randomEmailCode, verifyPassword } from "../../auth/crypto";
import { sendVerificationCode } from "../../auth/email";
import { setSessionCookie } from "../../auth/cookies";
import {
	consumeEmailCode,
	countRecentCodes,
	createSession,
	createUser,
	findUserByEmail,
	markEmailVerified,
	saveEmailCode,
	updateUserForReRegister,
} from "../../auth/store";

const emailSchema = z.email("Invalid email format").max(254).toLowerCase();
const passwordSchema = z
	.string()
	.min(CONFIG.AUTH.PASSWORD_MIN_LENGTH, "Password too short")
	.max(CONFIG.AUTH.PASSWORD_MAX_LENGTH, "Password too long");

/** Issue and email a fresh code; returns an error string or null. */
async function issueCode(
	c: { env: Env },
	email: string,
): Promise<string | null> {
	if ((await countRecentCodes(c.env.DB, email)) >= CONFIG.AUTH.EMAIL_CODE_HOURLY_LIMIT) {
		return "too_many_codes";
	}
	const code = randomEmailCode();
	await saveEmailCode(c.env.DB, email, code);
	const sent = await sendVerificationCode(c.env, email, code);
	return sent ? null : "email_send_failed";
}

export const emailAuthRoutes = new Hono<{ Bindings: Env }>()
	// POST /api/auth/register — create an unverified account and send a code
	.post(
		"/register",
		zValidator(
			"json",
			z.object({
				email: emailSchema,
				password: passwordSchema,
				name: z.string().trim().max(100).default(""),
			}),
		),
		async (c) => {
			const { email, password, name } = c.req.valid("json");
			console.log(`[AUTH] POST /register email=${email}`);

			const existing = await findUserByEmail(c.env.DB, email);
			if (existing?.emailVerified) {
				return c.json({ error: "email_taken" }, 409);
			}

			const passwordHash = await hashPassword(password);
			if (existing) {
				// Unverified leftover from an earlier attempt — refresh it.
				await updateUserForReRegister(c.env.DB, existing.id, {
					name: name || existing.name,
					passwordHash,
				});
			} else {
				await createUser(c.env.DB, {
					email,
					name,
					emailVerified: false,
					passwordHash,
				});
			}

			const error = await issueCode(c, email);
			if (error) return c.json({ error }, error === "too_many_codes" ? 429 : 502);
			return c.json({ ok: true, needsVerification: true }, 201);
		},
	)

	// POST /api/auth/verify-email — confirm the code, log the user in
	.post(
		"/verify-email",
		zValidator(
			"json",
			z.object({ email: emailSchema, code: z.string().regex(/^\d{6}$/) }),
		),
		async (c) => {
			const { email, code } = c.req.valid("json");
			console.log(`[AUTH] POST /verify-email email=${email}`);

			const user = await findUserByEmail(c.env.DB, email);
			if (!user) return c.json({ error: "invalid_code" }, 400);

			const valid = await consumeEmailCode(c.env.DB, email, code);
			if (!valid) return c.json({ error: "invalid_code" }, 400);

			await markEmailVerified(c.env.DB, user.id);
			const session = await createSession(c.env.DB, user.id, {
				ip: c.req.header("cf-connecting-ip"),
				userAgent: c.req.header("user-agent"),
			});
			setSessionCookie(c, session.token, session.expiresAt);
			return c.json({
				ok: true,
				user: { id: user.id, email: user.email, name: user.name, image: user.image },
			});
		},
	)

	// POST /api/auth/resend-code — send a fresh verification code
	.post(
		"/resend-code",
		zValidator("json", z.object({ email: emailSchema })),
		async (c) => {
			const { email } = c.req.valid("json");
			console.log(`[AUTH] POST /resend-code email=${email}`);

			const user = await findUserByEmail(c.env.DB, email);
			// Don't reveal whether the address is registered.
			if (!user || user.emailVerified) return c.json({ ok: true });

			const error = await issueCode(c, email);
			if (error) return c.json({ error }, error === "too_many_codes" ? 429 : 502);
			return c.json({ ok: true });
		},
	)

	// POST /api/auth/login — email + password
	.post(
		"/login",
		zValidator(
			"json",
			z.object({ email: emailSchema, password: z.string().min(1).max(CONFIG.AUTH.PASSWORD_MAX_LENGTH) }),
		),
		async (c) => {
			const { email, password } = c.req.valid("json");
			console.log(`[AUTH] POST /login email=${email}`);

			const user = await findUserByEmail(c.env.DB, email);
			if (!user) return c.json({ error: "invalid_credentials" }, 401);
			if (!user.passwordHash) {
				// OAuth-only account — no password to check.
				return c.json({ error: "no_password_set" }, 400);
			}
			const ok = await verifyPassword(password, user.passwordHash);
			if (!ok) return c.json({ error: "invalid_credentials" }, 401);

			if (!user.emailVerified) {
				// Password is right but the mailbox was never confirmed:
				// push the client into the verification step.
				const error = await issueCode(c, email);
				if (error === "email_send_failed") return c.json({ error }, 502);
				return c.json({ error: "email_not_verified", needsVerification: true }, 403);
			}

			const session = await createSession(c.env.DB, user.id, {
				ip: c.req.header("cf-connecting-ip"),
				userAgent: c.req.header("user-agent"),
			});
			setSessionCookie(c, session.token, session.expiresAt);
			return c.json({
				ok: true,
				user: { id: user.id, email: user.email, name: user.name, image: user.image },
			});
		},
	);
