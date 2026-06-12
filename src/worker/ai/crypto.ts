/**
 * At-rest encryption for user-supplied AI API keys (AES-256-GCM).
 * The AES key is derived from AUTH_SECRET via SHA-256 with a fixed,
 * purpose-specific prefix, so a leaked database dump alone cannot
 * reveal stored provider keys.
 */

import { fromBase64Url, toBase64Url } from "../auth/crypto";

const encoder = new TextEncoder();

// Purpose-binding prefix: keeps this derived key distinct from any other
// future use of AUTH_SECRET as key material.
const KEY_CONTEXT = "nanobee:ai-api-key:v1:";

async function deriveAesKey(secret: string): Promise<CryptoKey> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		encoder.encode(KEY_CONTEXT + secret),
	);
	return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
		"encrypt",
		"decrypt",
	]);
}

/** Encrypt a secret into a self-describing "v1$iv$ciphertext" string. */
export async function encryptSecret(
	plaintext: string,
	secret: string,
): Promise<string> {
	const key = await deriveAesKey(secret);
	const iv = new Uint8Array(12);
	crypto.getRandomValues(iv);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv as BufferSource },
		key,
		encoder.encode(plaintext),
	);
	return `v1$${toBase64Url(iv)}$${toBase64Url(new Uint8Array(ciphertext))}`;
}

/** Decrypt a "v1$iv$ciphertext" string; returns null when invalid/tampered. */
export async function decryptSecret(
	stored: string,
	secret: string,
): Promise<string | null> {
	const [version, ivRaw, ctRaw] = stored.split("$");
	if (version !== "v1" || !ivRaw || !ctRaw) return null;
	try {
		const key = await deriveAesKey(secret);
		const plaintext = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: fromBase64Url(ivRaw) as BufferSource },
			key,
			fromBase64Url(ctRaw) as BufferSource,
		);
		return new TextDecoder().decode(plaintext);
	} catch {
		return null;
	}
}
