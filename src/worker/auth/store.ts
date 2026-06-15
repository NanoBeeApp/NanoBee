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
	if (!row) return null;
	// Fire-and-forget: bump last_seen so the session list has live timestamps.
	void db
		.prepare("UPDATE auth_sessions SET last_seen_at = unixepoch() WHERE id = ?")
		.bind(id)
		.run();
	return toAuthUser(row);
}

/**
 * Resolve session to user AND return the hashed session id so callers
 * can pass it to functions that need both (e.g. listUserSessions to mark current).
 */
export async function getUserAndSessionId(
	db: D1Database,
	token: string,
): Promise<{ user: AuthUser; sessionId: string } | null> {
	const sessionId = await sha256Hex(token);
	const row = await db
		.prepare(
			`SELECT u.id, u.email, u.name, u.image, u.email_verified, u.password_hash
			 FROM auth_sessions s JOIN users u ON u.id = s.user_id
			 WHERE s.id = ? AND s.expires_at > unixepoch()`,
		)
		.bind(sessionId)
		.first<UserRow>();
	if (!row) return null;
	void db
		.prepare("UPDATE auth_sessions SET last_seen_at = unixepoch() WHERE id = ?")
		.bind(sessionId)
		.run();
	return { user: toAuthUser(row), sessionId };
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
	// Delegate to the purpose-aware version; 'verify' is the legacy default.
	return saveEmailCodeWithPurpose(db, email, code, "verify");
}

/**
 * Check a verification code. Counts failed attempts per code row and
 * deletes every code for the email on success (single use).
 * The `purpose` parameter guards against cross-purpose code consumption
 * (e.g. a reset code being accepted by the verify-email endpoint).
 */
export async function consumeEmailCode(
	db: D1Database,
	email: string,
	code: string,
	purpose: "verify" | "reset" = "verify",
): Promise<boolean> {
	const codeHash = await sha256Hex(`${email}:${code}`);
	const row = await db
		.prepare(
			`SELECT id FROM auth_email_codes
			 WHERE email = ? AND code_hash = ? AND purpose = ?
			   AND expires_at > unixepoch() AND attempts < ?`,
		)
		.bind(email, codeHash, purpose, CONFIG.AUTH.EMAIL_CODE_MAX_ATTEMPTS)
		.first<{ id: string }>();
	if (!row) {
		// Burn an attempt on every live code for this email+purpose to stop brute force.
		await db
			.prepare(
				`UPDATE auth_email_codes SET attempts = attempts + 1
				 WHERE email = ? AND purpose = ? AND expires_at > unixepoch()`,
			)
			.bind(email, purpose)
			.run();
		return false;
	}
	await db
		.prepare("DELETE FROM auth_email_codes WHERE email = ? AND purpose = ?")
		.bind(email, purpose)
		.run();
	return true;
}

/** Save a code with an explicit purpose ('verify' | 'reset'). */
export async function saveEmailCodeWithPurpose(
	db: D1Database,
	email: string,
	code: string,
	purpose: "verify" | "reset",
): Promise<void> {
	const codeHash = await sha256Hex(`${email}:${code}`);
	const expiresAt =
		Math.floor(Date.now() / 1000) + CONFIG.AUTH.EMAIL_CODE_TTL_SECONDS;
	await db
		.prepare("DELETE FROM auth_email_codes WHERE created_at < unixepoch() - 3600")
		.run();
	await db
		.prepare(
			"INSERT INTO auth_email_codes (id, email, code_hash, purpose, expires_at) VALUES (?, ?, ?, ?, ?)",
		)
		.bind(`code_${nanoid(12)}`, email, codeHash, purpose, expiresAt)
		.run();
}

/** Rate limit per (email, purpose) pair (same 5-per-hour window). */
export async function countRecentCodesForPurpose(
	db: D1Database,
	email: string,
	purpose: "verify" | "reset",
): Promise<number> {
	const row = await db
		.prepare(
			`SELECT COUNT(*) AS n FROM auth_email_codes
			 WHERE email = ? AND purpose = ? AND created_at > unixepoch() - 3600`,
		)
		.bind(email, purpose)
		.first<{ n: number }>();
	return row?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Session management (list / revoke / last-seen touch)
// ---------------------------------------------------------------------------

export type SessionInfo = {
	id: string;
	createdAt: number;
	/** Unix timestamp of last activity. Null for legacy sessions created before
	 *  migration 0016 (last_seen_at column did not exist yet). */
	lastSeenAt: number | null;
	expiresAt: number;
	ip: string | null;
	userAgent: string | null;
};

/** List all non-expired sessions for a user, newest first. */
export async function listUserSessions(
	db: D1Database,
	userId: string,
): Promise<SessionInfo[]> {
	const rows = await db
		.prepare(
			`SELECT id, created_at, last_seen_at, expires_at, ip, user_agent
			 FROM auth_sessions
			 WHERE user_id = ? AND expires_at > unixepoch()
			 ORDER BY last_seen_at DESC`,
		)
		.bind(userId)
		.all<{
			id: string;
			created_at: number;
			last_seen_at: number | null;
			expires_at: number;
			ip: string | null;
			user_agent: string | null;
		}>();
	return (rows.results ?? []).map((r) => ({
		id: r.id,
		createdAt: r.created_at,
		lastSeenAt: r.last_seen_at,
		expiresAt: r.expires_at,
		ip: r.ip,
		userAgent: r.user_agent,
	}));
}

/** Delete a specific session by its hashed id (the stored value, not the cookie token). */
export async function deleteSessionById(
	db: D1Database,
	sessionId: string,
	userId: string,
): Promise<void> {
	await db
		.prepare("DELETE FROM auth_sessions WHERE id = ? AND user_id = ?")
		.bind(sessionId, userId)
		.run();
}

/** Delete all sessions for a user except the one with the given hashed id. */
export async function deleteOtherSessions(
	db: D1Database,
	userId: string,
	currentSessionId: string,
): Promise<void> {
	await db
		.prepare("DELETE FROM auth_sessions WHERE user_id = ? AND id != ?")
		.bind(userId, currentSessionId)
		.run();
}

/** Delete ALL sessions for a user (used during account deletion). */
export async function deleteAllUserSessions(
	db: D1Database,
	userId: string,
): Promise<void> {
	await db
		.prepare("DELETE FROM auth_sessions WHERE user_id = ?")
		.bind(userId)
		.run();
}

/** Bump last_seen_at on the current session (fire-and-forget). */
export async function touchSessionLastSeen(
	db: D1Database,
	sessionId: string,
): Promise<void> {
	await db
		.prepare("UPDATE auth_sessions SET last_seen_at = unixepoch() WHERE id = ?")
		.bind(sessionId)
		.run();
}

// ---------------------------------------------------------------------------
// Profile updates
// ---------------------------------------------------------------------------

/** Update the user's display name. */
export async function updateUserName(
	db: D1Database,
	userId: string,
	name: string,
): Promise<void> {
	await db
		.prepare("UPDATE users SET name = ?, updated_at = unixepoch() WHERE id = ?")
		.bind(name, userId)
		.run();
}

/** Update the user's password hash and revoke all other sessions (security). */
export async function updateUserPassword(
	db: D1Database,
	userId: string,
	passwordHash: string,
	keepSessionId: string | null,
): Promise<void> {
	await db
		.prepare("UPDATE users SET password_hash = ?, updated_at = unixepoch() WHERE id = ?")
		.bind(passwordHash, userId)
		.run();
	// Invalidate all sessions except the one the user is currently using
	// (or all sessions when called from password-reset without a session).
	if (keepSessionId) {
		await db
			.prepare("DELETE FROM auth_sessions WHERE user_id = ? AND id != ?")
			.bind(userId, keepSessionId)
			.run();
	} else {
		await deleteAllUserSessions(db, userId);
	}
}

/** Fetch full user row for data export (includes created_at). */
export async function getUserRowForExport(
	db: D1Database,
	userId: string,
): Promise<{ id: string; email: string; name: string; image: string | null; created_at: number } | null> {
	return db
		.prepare("SELECT id, email, name, image, created_at FROM users WHERE id = ?")
		.bind(userId)
		.first<{ id: string; email: string; name: string; image: string | null; created_at: number }>();
}
