/**
 * D1 persistence for the auth system: users, OAuth account links,
 * server-side sessions and email verification codes.
 * All session lookups go through the SHA-256 hash of the cookie token.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { nanoid } from "nanoid";
import { CONFIG } from "../config";
import { randomToken, sha256Hex } from "./crypto";

export type AuthUser = {
	id: string;
	email: string;
	name: string;
	image: string | null;
	emailVerified: boolean;
};

type UserRow = {
	id: string;
	email: string;
	name: string;
	image: string | null;
	email_verified: number;
	password_hash: string | null;
};

function toAuthUser(row: UserRow): AuthUser {
	return {
		id: row.id,
		email: row.email,
		name: row.name,
		image: row.image,
		emailVerified: row.email_verified === 1,
	};
}

const USER_COLUMNS = "id, email, name, image, email_verified, password_hash";

export async function findUserByEmail(
	db: D1Database,
	email: string,
): Promise<(AuthUser & { passwordHash: string | null }) | null> {
	const row = await db
		.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`)
		.bind(email)
		.first<UserRow>();
	if (!row) return null;
	return { ...toAuthUser(row), passwordHash: row.password_hash };
}

export async function createUser(
	db: D1Database,
	input: {
		email: string;
		name: string;
		image?: string | null;
		emailVerified: boolean;
		passwordHash?: string | null;
	},
): Promise<AuthUser> {
	const id = `u_${nanoid(12)}`;
	await db
		.prepare(
			`INSERT INTO users (id, email, name, image, email_verified, password_hash)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			input.email,
			input.name,
			input.image ?? null,
			input.emailVerified ? 1 : 0,
			input.passwordHash ?? null,
		)
		.run();
	return {
		id,
		email: input.email,
		name: input.name,
		image: input.image ?? null,
		emailVerified: input.emailVerified,
	};
}

export async function updateUserForReRegister(
	db: D1Database,
	userId: string,
	input: { name: string; passwordHash: string },
): Promise<void> {
	await db
		.prepare(
			"UPDATE users SET name = ?, password_hash = ?, updated_at = unixepoch() WHERE id = ?",
		)
		.bind(input.name, input.passwordHash, userId)
		.run();
}

export async function markEmailVerified(
	db: D1Database,
	userId: string,
): Promise<void> {
	await db
		.prepare(
			"UPDATE users SET email_verified = 1, updated_at = unixepoch() WHERE id = ?",
		)
		.bind(userId)
		.run();
}

/** Fill in profile fields the first OAuth login can provide. */
export async function enrichUserProfile(
	db: D1Database,
	userId: string,
	input: { name?: string; image?: string | null },
): Promise<void> {
	await db
		.prepare(
			`UPDATE users SET
			   name = CASE WHEN name = '' AND ? != '' THEN ? ELSE name END,
			   image = COALESCE(image, ?),
			   updated_at = unixepoch()
			 WHERE id = ?`,
		)
		.bind(input.name ?? "", input.name ?? "", input.image ?? null, userId)
		.run();
}

// ---------------------------------------------------------------------------
// OAuth account links
// ---------------------------------------------------------------------------

export async function findAccount(
	db: D1Database,
	provider: string,
	providerAccountId: string,
): Promise<{ userId: string } | null> {
	const row = await db
		.prepare(
			"SELECT user_id FROM auth_accounts WHERE provider = ? AND provider_account_id = ?",
		)
		.bind(provider, providerAccountId)
		.first<{ user_id: string }>();
	return row ? { userId: row.user_id } : null;
}

export async function linkAccount(
	db: D1Database,
	input: {
		userId: string;
		provider: string;
		providerAccountId: string;
		email: string | null;
	},
): Promise<void> {
	await db
		.prepare(
			`INSERT OR IGNORE INTO auth_accounts (id, user_id, provider, provider_account_id, email)
			 VALUES (?, ?, ?, ?, ?)`,
		)
		.bind(
			`acc_${nanoid(12)}`,
			input.userId,
			input.provider,
			input.providerAccountId,
			input.email,
		)
		.run();
}

export async function getUserById(
	db: D1Database,
	userId: string,
): Promise<AuthUser | null> {
	const row = await db
		.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`)
		.bind(userId)
		.first<UserRow>();
	return row ? toAuthUser(row) : null;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/** Create a session row and return the raw cookie token (never stored). */
export async function createSession(
	db: D1Database,
	userId: string,
	meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<{ token: string; expiresAt: number }> {
	const token = randomToken();
	const id = await sha256Hex(token);
	const expiresAt =
		Math.floor(Date.now() / 1000) + CONFIG.AUTH.SESSION_TTL_SECONDS;
	// Lazy cleanup: expired sessions are useless, drop them as we go.
	await db
		.prepare("DELETE FROM auth_sessions WHERE expires_at < unixepoch()")
		.run();
	await db
		.prepare(
			`INSERT INTO auth_sessions (id, user_id, expires_at, ip, user_agent)
			 VALUES (?, ?, ?, ?, ?)`,
		)
		.bind(id, userId, expiresAt, meta.ip ?? null, meta.userAgent ?? null)
		.run();
	return { token, expiresAt };
}

export async function getUserBySessionToken(
	db: D1Database,
	token: string,
): Promise<AuthUser | null> {
	const id = await sha256Hex(token);
	const row = await db
		.prepare(
			`SELECT u.id, u.email, u.name, u.image, u.email_verified, u.password_hash
			 FROM auth_sessions s JOIN users u ON u.id = s.user_id
			 WHERE s.id = ? AND s.expires_at > unixepoch()`,
		)
		.bind(id)
		.first<UserRow>();
	return row ? toAuthUser(row) : null;
}

export async function deleteSessionByToken(
	db: D1Database,
	token: string,
): Promise<void> {
	const id = await sha256Hex(token);
	await db.prepare("DELETE FROM auth_sessions WHERE id = ?").bind(id).run();
}

// ---------------------------------------------------------------------------
// Email verification codes
// ---------------------------------------------------------------------------

/** Rate limit: how many codes were issued for this email in the last hour. */
export async function countRecentCodes(
	db: D1Database,
	email: string,
): Promise<number> {
	const row = await db
		.prepare(
			"SELECT COUNT(*) AS n FROM auth_email_codes WHERE email = ? AND created_at > unixepoch() - 3600",
		)
		.bind(email)
		.first<{ n: number }>();
	return row?.n ?? 0;
}

export async function saveEmailCode(
	db: D1Database,
	email: string,
	code: string,
): Promise<void> {
	const codeHash = await sha256Hex(`${email}:${code}`);
	const expiresAt =
		Math.floor(Date.now() / 1000) + CONFIG.AUTH.EMAIL_CODE_TTL_SECONDS;
	// Lazy cleanup: codes older than the rate-limit window (1h) are dead
	// weight — they no longer count toward countRecentCodes either.
	await db
		.prepare("DELETE FROM auth_email_codes WHERE created_at < unixepoch() - 3600")
		.run();
	await db
		.prepare(
			"INSERT INTO auth_email_codes (id, email, code_hash, expires_at) VALUES (?, ?, ?, ?)",
		)
		.bind(`code_${nanoid(12)}`, email, codeHash, expiresAt)
		.run();
}

/**
 * Check a verification code. Counts failed attempts per code row and
 * deletes every code for the email on success (single use).
 */
export async function consumeEmailCode(
	db: D1Database,
	email: string,
	code: string,
): Promise<boolean> {
	const codeHash = await sha256Hex(`${email}:${code}`);
	const row = await db
		.prepare(
			`SELECT id FROM auth_email_codes
			 WHERE email = ? AND code_hash = ? AND expires_at > unixepoch() AND attempts < ?`,
		)
		.bind(email, codeHash, CONFIG.AUTH.EMAIL_CODE_MAX_ATTEMPTS)
		.first<{ id: string }>();
	if (!row) {
		// Burn an attempt on every live code for this email to stop brute force.
		await db
			.prepare(
				"UPDATE auth_email_codes SET attempts = attempts + 1 WHERE email = ? AND expires_at > unixepoch()",
			)
			.bind(email)
			.run();
		return false;
	}
	await db
		.prepare("DELETE FROM auth_email_codes WHERE email = ?")
		.bind(email)
		.run();
	return true;
}
