/**
 * VAPID JWT signing (RFC 8292) and RFC 8291 Web Push payload encryption
 * using WebCrypto only — no Node.js crypto, no npm packages.
 *
 * Phase 1b: this module is only active when VAPID_PUBLIC_KEY and
 * VAPID_PRIVATE_KEY_ENC are both set in the worker env. The in-app feed
 * (updates table) is the guaranteed Phase 1a delivery channel; Web Push is
 * additive.
 *
 * All functions must be called inside handler/function scope only.
 * nanoid()/Date.now()/new Date() at module level violate Workers deploy rules.
 */

import type { Env } from "../api-worker";
import { decryptSecret } from "../ai/crypto";
import { fromBase64Url, toBase64Url } from "../auth/crypto";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Purpose-binding prefix for push auth secret encryption — distinct from the
// AI key context so key derivation can never collide between purposes.
const PUSH_AUTH_KEY_CONTEXT = "nanobee:push-auth:v1:";

// ---------------------------------------------------------------------------
// Push auth secret encryption (used by push routes on subscribe)
// ---------------------------------------------------------------------------

/**
 * Encrypt the push subscription auth secret using AUTH_SECRET-derived AES-256-GCM.
 * Uses the push-specific KEY_CONTEXT to prevent collisions with AI key encryption.
 */
export async function encryptPushAuth(plaintext: string, authSecret: string): Promise<string> {
	// Derive key with push-specific context by temporarily patching the context.
	// We re-implement the encrypt step here with the PUSH_AUTH_KEY_CONTEXT.
	const digest = await crypto.subtle.digest("SHA-256", encoder.encode(PUSH_AUTH_KEY_CONTEXT + authSecret));
	const key = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt"]);
	const iv = new Uint8Array(12);
	crypto.getRandomValues(iv);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv as BufferSource },
		key,
		encoder.encode(plaintext),
	);
	return `v1$${toBase64Url(iv)}$${toBase64Url(new Uint8Array(ciphertext))}`;
}

/**
 * Decrypt a push auth secret stored as "v1$iv$ct".
 * Returns null when the stored value is invalid or was tampered with.
 */
export async function decryptPushAuth(stored: string, authSecret: string): Promise<string | null> {
	const [version, ivRaw, ctRaw] = stored.split("$");
	if (version !== "v1" || !ivRaw || !ctRaw) return null;
	try {
		const digest = await crypto.subtle.digest("SHA-256", encoder.encode(PUSH_AUTH_KEY_CONTEXT + authSecret));
		const key = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["decrypt"]);
		const plaintext = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: fromBase64Url(ivRaw) as BufferSource },
			key,
			fromBase64Url(ctRaw) as BufferSource,
		);
		return decoder.decode(plaintext);
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// VAPID JWT signing (RFC 8292)
// ---------------------------------------------------------------------------

/**
 * Sign a VAPID JWT using P-256 ECDSA with SHA-256.
 *
 * @param privateKeyJwkJson  JSON-serialized JWK of the P-256 private key
 *                           (as produced by generateVapidKeyPair() and stored
 *                           encrypted in VAPID_PRIVATE_KEY_ENC after decryption).
 * @param audience           The push service origin (e.g. "https://fcm.googleapis.com").
 * @param subject            Contact URI (mailto: or https:) for the push provider.
 * @returns                  JWT string suitable for the Authorization header.
 */
export async function signVapidJwt(
	privateKeyJwkJson: string,
	audience: string,
	subject: string,
): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const header = base64urlEncode(JSON.stringify({ typ: "JWT", alg: "ES256" }));
	const payload = base64urlEncode(
		JSON.stringify({ aud: audience, exp: now + 12 * 3600, sub: subject }),
	);
	const signingInput = `${header}.${payload}`;

	// Import the full JWK (d + x + y) as a P-256 ECDSA signing key.
	const cryptoKey = await importVapidPrivateKey(privateKeyJwkJson);

	const signature = await crypto.subtle.sign(
		{ name: "ECDSA", hash: { name: "SHA-256" } },
		cryptoKey,
		encoder.encode(signingInput),
	);

	const sig = toBase64Url(new Uint8Array(signature));
	return `${signingInput}.${sig}`;
}

// ---------------------------------------------------------------------------
// RFC 8291 payload encryption (aes128gcm content encoding)
// ---------------------------------------------------------------------------

interface PushSubscription {
	endpoint: string;
	p256dh: string;      // Browser's P-256 DH public key (base64url)
	authPlaintext: string; // Decrypted push auth secret (base64url)
}

/**
 * Encrypt a plain-text push payload using RFC 8291 aes128gcm content encoding.
 *
 * Steps:
 * 1. Import the browser's P-256 DH public key (p256dh).
 * 2. Generate an ephemeral P-256 key pair.
 * 3. ECDH: derive a shared secret between the ephemeral private key and the
 *    browser's public key.
 * 4. HKDF: derive auth_secret → ikm (using the auth secret).
 * 5. HKDF: derive content_encryption_key (16 bytes) and nonce (12 bytes).
 * 6. AES-128-GCM encrypt the payload with a 16-byte record header.
 *
 * Returns the encrypted body as an ArrayBuffer.
 */
export async function encryptPushPayload(
	p256dhBase64url: string,
	authBase64url: string,
	payloadText: string,
): Promise<ArrayBuffer> {
	// 1. Import the browser's P-256 public key.
	// Slice creates a new Uint8Array backed by a plain ArrayBuffer (not SharedArrayBuffer),
	// satisfying the strict BufferSource typing in newer TypeScript lib.dom definitions.
	const p256dhBytes = fromBase64Url(p256dhBase64url).slice();
	const receiverPublicKey = await crypto.subtle.importKey(
		"raw",
		p256dhBytes,
		{ name: "ECDH", namedCurve: "P-256" },
		true,
		[],
	);

	// 2. Generate ephemeral sender key pair.
	// Cast to CryptoKeyPair: generateKey with ["deriveBits"] returns a key pair for ECDH.
	const senderKeyPair = (await crypto.subtle.generateKey(
		{ name: "ECDH", namedCurve: "P-256" },
		true,
		["deriveBits"],
	)) as CryptoKeyPair;

	// Export the sender's public key in raw format (65 bytes uncompressed P-256).
	// exportKey("raw") always returns ArrayBuffer for public keys; cast away the union.
	const senderPublicKeyRaw = new Uint8Array(
		(await crypto.subtle.exportKey("raw", senderKeyPair.publicKey)) as ArrayBuffer,
	);

	// 3. ECDH: derive shared secret (32 bytes).
	// Cast as `unknown as string` to satisfy both the Cloudflare Workers types
	// (SubtleCryptoDeriveKeyAlgorithm with $public) and the DOM types
	// (EcdhKeyDeriveParams with public). Both type sets accept `string` as the
	// algorithm parameter, and the runtime algorithm object works in both envs.
	const ecdhSecret = await crypto.subtle.deriveBits(
		{ name: "ECDH", public: receiverPublicKey } as unknown as string,
		senderKeyPair.privateKey,
		256,
	);

	// 4-5. Use HKDF to derive CEK and nonce per RFC 8291 §3.3.
	// .slice() ensures a plain ArrayBuffer backing (not SharedArrayBuffer) for DOM type compatibility.
	const authSecretBytes = fromBase64Url(authBase64url).slice();
	const salt = crypto.getRandomValues(new Uint8Array(16));

	// RFC 8291 key derivation:
	// ikm = HKDF(salt=auth_secret, ikm=ecdh_secret, info="Content-Encoding: auth\0", len=32)
	const ikmKey = await crypto.subtle.importKey(
		"raw",
		ecdhSecret,
		"HKDF",
		false,
		["deriveBits"],
	);
	const ikm = await crypto.subtle.deriveBits(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: authSecretBytes,
			info: encoder.encode("Content-Encoding: auth\0"),
		} as unknown as string,
		ikmKey,
		256,
	);

	// Build keyinfo and nonceinfo per RFC 8291 §3.3.
	// RFC 8291 info parameters are just the content-encoding label — the P-256
	// key material is incorporated into IKM in the auth HKDF step above, NOT here.
	// (The old draft-ietf-webpush-encryption format embedded keys in info; RFC 8291 does not.)
	const keyInfo = encoder.encode("Content-Encoding: aes128gcm\0");
	const nonceInfo = encoder.encode("Content-Encoding: nonce\0");

	const hkdfKey = await crypto.subtle.importKey(
		"raw",
		ikm,
		"HKDF",
		false,
		["deriveBits"],
	);

	const cekBits = await crypto.subtle.deriveBits(
		{ name: "HKDF", hash: "SHA-256", salt, info: keyInfo } as unknown as string,
		hkdfKey,
		128, // AES-128
	);
	const nonceBits = await crypto.subtle.deriveBits(
		{ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo } as unknown as string,
		hkdfKey,
		96, // 12-byte nonce
	);

	const cek = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);
	const nonce = new Uint8Array(nonceBits);

	// 6. Encrypt the payload. Add a padding delimiter byte (0x02 = last record).
	const plaintext = encoder.encode(payloadText);
	const paddedPlaintext = new Uint8Array(plaintext.length + 1);
	paddedPlaintext.set(plaintext);
	paddedPlaintext[plaintext.length] = 0x02; // delimiter

	const ciphertext = new Uint8Array(
		await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cek, paddedPlaintext),
	);

	// Build the RFC 8291 aes128gcm record header (86 bytes):
	// salt (16) + rs (4, big-endian uint32) + idlen (1) + keyid (65 = sender pub key)
	const rs = 4096; // record size
	const header = new Uint8Array(16 + 4 + 1 + senderPublicKeyRaw.length);
	header.set(salt, 0);
	new DataView(header.buffer).setUint32(16, rs, false); // big-endian
	header[20] = senderPublicKeyRaw.length; // idlen = 65
	header.set(senderPublicKeyRaw, 21);

	// Concatenate header + ciphertext.
	const result = new Uint8Array(header.length + ciphertext.length);
	result.set(header, 0);
	result.set(ciphertext, header.length);
	return result.buffer;
}

// ---------------------------------------------------------------------------
// HTTP push delivery
// ---------------------------------------------------------------------------

interface PushMessage {
	title: string;
	body: string;
}

/**
 * Send a Web Push notification to one subscription endpoint.
 *
 * @returns true on success (201/200), false on 410 (subscription expired —
 *          caller should delete the row), throws on other HTTP errors.
 */
export async function sendWebPush(
	env: Env,
	subscription: PushSubscription,
	message: PushMessage,
): Promise<boolean> {
	if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY_ENC || !env.AUTH_SECRET) {
		throw new Error("VAPID keys not configured");
	}

	// Decrypt the stored private key.
	const privateKeyEnc = await decryptSecret(env.VAPID_PRIVATE_KEY_ENC, env.AUTH_SECRET);
	if (!privateKeyEnc) throw new Error("Failed to decrypt VAPID private key");

	// Derive the audience from the subscription endpoint.
	const endpointUrl = new URL(subscription.endpoint);
	const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

	// Sign the VAPID JWT.
	const jwt = await signVapidJwt(
		privateKeyEnc,
		audience,
		"mailto:noreply@nanobee.app",
	);

	// Encrypt the payload.
	const payloadJson = JSON.stringify({ title: message.title, body: message.body });
	const encryptedBody = await encryptPushPayload(
		subscription.p256dh,
		subscription.authPlaintext,
		payloadJson,
	);

	// POST to the push endpoint.
	const res = await fetch(subscription.endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/octet-stream",
			"Content-Encoding": "aes128gcm",
			Authorization: `vapid t=${jwt},k=${env.VAPID_PUBLIC_KEY}`,
			TTL: "86400",
		},
		body: encryptedBody,
	});

	if (res.status === 410 || res.status === 404) {
		// Subscription is expired or gone.
		return false;
	}
	if (res.status >= 200 && res.status < 300) {
		return true;
	}
	throw new Error(`Push endpoint returned HTTP ${res.status}`);
}

// ---------------------------------------------------------------------------
// Key generation utility (run once during setup)
// ---------------------------------------------------------------------------

/**
 * Generate a new VAPID P-256 key pair.
 * Run this once with a one-off Worker script or wrangler dev, then:
 * - Store `publicKey` in wrangler.json vars.VAPID_PUBLIC_KEY.
 * - Encrypt `privateKeyJwk` with AUTH_SECRET via encryptSecret() and store
 *   the result as the Worker secret VAPID_PRIVATE_KEY_ENC.
 *
 * `privateKeyJwk` is the full JSON-serialized JWK (including d, x, y) of
 * the P-256 private key. Storing the full JWK — not just the raw `d` scalar
 * — avoids having to reconstruct x/y at sign time (WebCrypto P-256 import
 * requires all three coordinates for private key material).
 *
 * NEVER regenerate after subscriptions exist — changing the public key
 * invalidates all existing browser push subscriptions.
 */
export async function generateVapidKeyPair(): Promise<{
	/** base64url-encoded raw P-256 public key (65 bytes, uncompressed). */
	publicKey: string;
	/**
	 * JSON-serialized JWK of the P-256 private key (includes kty, crv, d, x, y).
	 * Encrypt this value before storing: encryptSecret(privateKeyJwk, AUTH_SECRET).
	 */
	privateKeyJwk: string;
}> {
	// Cast to CryptoKeyPair: generateKey with ["sign", "verify"] always returns a key pair for ECDSA.
	const keyPair = (await crypto.subtle.generateKey(
		{ name: "ECDSA", namedCurve: "P-256" },
		true,
		["sign", "verify"],
	)) as CryptoKeyPair;
	// exportKey("raw") returns ArrayBuffer for raw public keys; cast away the union.
	const publicKeyRaw = new Uint8Array(
		(await crypto.subtle.exportKey("raw", keyPair.publicKey)) as ArrayBuffer,
	);
	// Export the full private key JWK (includes d + x + y).
	// exportKey("jwk") returns JsonWebKey; cast away the union.
	const privateJwk = (await crypto.subtle.exportKey("jwk", keyPair.privateKey)) as JsonWebKey;
	return {
		publicKey: toBase64Url(publicKeyRaw),
		privateKeyJwk: JSON.stringify(privateJwk),
	};
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Import a P-256 ECDSA private key from the JSON-serialized JWK stored in
 * VAPID_PRIVATE_KEY_ENC (after decryption). The JWK must include kty, crv,
 * d, x, and y — as exported by generateVapidKeyPair().
 *
 * WebCrypto P-256 private key import requires the full JWK (with x and y
 * coordinates of the public point, not just the raw scalar d). That is why
 * generateVapidKeyPair() stores the full JWK rather than just d.
 */
async function importVapidPrivateKey(privateKeyJwkJson: string): Promise<CryptoKey> {
	const jwk = JSON.parse(privateKeyJwkJson) as JsonWebKey;
	return crypto.subtle.importKey(
		"jwk",
		jwk,
		{ name: "ECDSA", namedCurve: "P-256" },
		false,
		["sign"],
	);
}

// buildInfo was removed: RFC 8291 §3.3 CEK/nonce info is just the content-encoding label,
// not a composite with P-256 key material (that was the old draft-ietf-webpush-encryption format).

/** JSON encode a string and base64url-encode the result (for JWT header/payload). */
function base64urlEncode(str: string): string {
	return toBase64Url(encoder.encode(str));
}
