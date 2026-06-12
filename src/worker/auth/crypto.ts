/**
 * Auth crypto primitives built on the WebCrypto API (Workers-compatible).
 * Password hashing (PBKDF2), session tokens, email codes and HMAC-signed
 * OAuth state — no external dependencies.
 */

const encoder = new TextEncoder();

// Cloudflare Workers caps PBKDF2 at 100k iterations; use the maximum.
const PBKDF2_ITERATIONS = 100_000;

export function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(value: string): Uint8Array {
	const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
	const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

export async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
	return [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/** Random URL-safe token for session cookies (256 bits of entropy). */
export function randomToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return toBase64Url(bytes);
}

/** Random 6-digit email verification code ("000000".."999999"). */
export function randomEmailCode(): string {
	const buf = new Uint32Array(1);
	crypto.getRandomValues(buf);
	return (buf[0] % 1_000_000).toString().padStart(6, "0");
}

async function derivePbkdf2(
	password: string,
	salt: Uint8Array,
	iterations: number,
): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
		key,
		256,
	);
	return new Uint8Array(bits);
}

/** Hash a password into a self-describing "pbkdf2$iter$salt$hash" string. */
export async function hashPassword(password: string): Promise<string> {
	const salt = new Uint8Array(16);
	crypto.getRandomValues(salt);
	const hash = await derivePbkdf2(password, salt, PBKDF2_ITERATIONS);
	return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(
	password: string,
	stored: string,
): Promise<boolean> {
	const [scheme, iterRaw, saltRaw, hashRaw] = stored.split("$");
	if (scheme !== "pbkdf2" || !iterRaw || !saltRaw || !hashRaw) return false;
	const iterations = Number(iterRaw);
	if (!Number.isInteger(iterations) || iterations < 1) return false;
	const derived = await derivePbkdf2(password, fromBase64Url(saltRaw), iterations);
	const expected = fromBase64Url(hashRaw);
	if (derived.length !== expected.length) return false;
	// Constant-time comparison
	let diff = 0;
	for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i];
	return diff === 0;
}

async function hmacSign(payload: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
	return toBase64Url(new Uint8Array(sig));
}

/** OAuth state payload carried through the provider round-trip. */
export type OAuthState = {
	provider: string;
	returnTo: string;
	nonce: string;
	issuedAt: number;
};

/** Encode + HMAC-sign an OAuth state ("payload.signature"). */
export async function signOAuthState(
	state: OAuthState,
	secret: string,
): Promise<string> {
	const payload = toBase64Url(encoder.encode(JSON.stringify(state)));
	const signature = await hmacSign(payload, secret);
	return `${payload}.${signature}`;
}

/** Verify and decode a signed OAuth state; returns null when invalid. */
export async function verifyOAuthState(
	value: string,
	secret: string,
	maxAgeMs: number,
): Promise<OAuthState | null> {
	const [payload, signature] = value.split(".");
	if (!payload || !signature) return null;
	const expected = await hmacSign(payload, secret);
	if (expected !== signature) return null;
	try {
		const state = JSON.parse(
			new TextDecoder().decode(fromBase64Url(payload)),
		) as OAuthState;
		if (Date.now() - state.issuedAt > maxAgeMs) return null;
		return state;
	} catch {
		return null;
	}
}
