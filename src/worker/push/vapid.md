# src/worker/push/vapid.ts

## Purpose

VAPID JWT signing (RFC 8292) and RFC 8291 Web Push payload encryption
using WebCrypto only — no Node.js `crypto` module, no npm packages.

**Phase 1b status**: this module is only active when `VAPID_PUBLIC_KEY` and
`VAPID_PRIVATE_KEY_ENC` are both set in the worker env. The in-app feed
(`updates` table) is the guaranteed Phase 1a delivery channel; Web Push is
additive and never blocks the scheduling engine.

## Core exports / API

- `encryptPushAuth(plaintext, authSecret)` — AES-256-GCM encrypt the push
  subscription auth secret using a `nanobee:push-auth:v1:` key context
  (distinct from the AI key context `nanobee:ai-api-key:v1:`).
- `decryptPushAuth(stored, authSecret)` — decrypt a `v1$iv$ct` string;
  returns `null` on failure. Called by the scheduler before `sendWebPush`.
- `signVapidJwt(privateKeyRaw, audience, subject)` — create a VAPID JWT
  using P-256 ECDSA / SHA-256.
- `encryptPushPayload(p256dh, authBase64url, payloadText)` — RFC 8291
  `aes128gcm` content encoding: ECDH + HKDF + AES-128-GCM.
- `sendWebPush(env, subscription, message)` — POST the encrypted payload to
  the push endpoint with a VAPID `Authorization` header. Returns `true` on
  success, `false` on HTTP 410/404 (expired subscription — caller should
  delete the row), throws on other errors.
- `generateVapidKeyPair()` — one-time setup utility; see setup procedure below.

## Setup procedure (run once)

1. Call `generateVapidKeyPair()` (e.g. via a one-time Worker script or local script).
   It returns `{ publicKey, privateKeyJwk }`.
2. Set `VAPID_PUBLIC_KEY` (the `publicKey` value) in `wrangler.json` `vars` for each
   environment (leave the placeholder `""` until you have generated the key).
3. Encrypt the private key JWK: `encryptSecret(privateKeyJwk, AUTH_SECRET)` →
   store the resulting `"v1$iv$ct"` string via:
   `wrangler secret put VAPID_PRIVATE_KEY_ENC --env <env>`
   or in `.dev.vars` for local dev.

**Never regenerate the key pair after subscriptions exist** — changing the
public key invalidates all existing browser push subscriptions and requires
re-subscribing all clients.

## Implementation notes

### Key storage format

`generateVapidKeyPair()` exports the **full P-256 private key JWK** (the
JSON-serialized object with `kty`, `crv`, `d`, `x`, `y`) as `privateKeyJwk`.
This full JWK is encrypted with `encryptSecret()` and stored as
`VAPID_PRIVATE_KEY_ENC`. At sign time `signVapidJwt()` decrypts and imports
the JWK directly via `crypto.subtle.importKey("jwk", ...)`.

WebCrypto requires `x` and `y` (the public key coordinates) alongside `d`
for P-256 private key import — storing only the raw `d` scalar is not
supported. `generateVapidKeyPair()` uses `exportKey("jwk", privateKey)`
which automatically includes all three fields.

### RFC 8291 aes128gcm encoding

1. Import browser's P-256 public key (`p256dh`).
2. Generate ephemeral P-256 key pair.
3. ECDH: derive shared secret (32 bytes).
4. HKDF-SHA-256 with auth secret → IKM (32 bytes).
5. HKDF-SHA-256 → CEK (16 bytes) + nonce (12 bytes).
6. AES-128-GCM encrypt with padding delimiter byte (0x02).
7. Prepend 86-byte record header: salt (16) + rs (4) + idlen (1) + sender key (65).

### WebCrypto HKDF quirk

`crypto.subtle.deriveBits` with HKDF requires `info` and `salt` as
`BufferSource` (not `Uint8Array`). Pass `.buffer` or `ArrayBuffer` directly.
`length` is in bits (128 for AES-128 CEK, 96 for 12-byte nonce).

## Dependencies

- `src/worker/ai/crypto` — `decryptSecret` for VAPID private key decryption
- `src/worker/auth/crypto` — `fromBase64Url`, `toBase64Url` base64url helpers
- WebCrypto: ECDH (P-256), ECDSA (P-256), HKDF, AES-GCM

## Change history & rationale

### 2026-06-15 — Fix RFC 8291 CEK/nonce HKDF info parameter (security review)

`encryptPushPayload` was passing P-256 key material inside the `keyInfo` /
`nonceInfo` HKDF parameters (the old `draft-ietf-webpush-encryption` format).
RFC 8291 specifies that the CEK and nonce info parameters must be just the
content-encoding label bytes (`"Content-Encoding: aes128gcm\0"` and
`"Content-Encoding: nonce\0"` respectively); the P-256 key material belongs in
the IKM derivation phase only (`"Content-Encoding: auth\0"` HKDF step, which
was already correct). The stale `buildInfo()` helper was removed. Without this
fix every push delivery would silently fail on modern browsers.

### 2026-06-15 — Fixed VAPID private key storage format; added client-side usePushNotifications hook

Updated `generateVapidKeyPair()` to return `privateKeyJwk` (full JSON JWK with `d`, `x`, `y`)
instead of the raw `d` scalar. WebCrypto P-256 private key import via `importKey("jwk", ...)` requires
`x` and `y` alongside `d`; storing only `d` made `signVapidJwt` fail at import time. The new
`importVapidPrivateKey()` helper parses the JSON JWK and imports it directly.
Updated `signVapidJwt()` parameter name from `privateKeyRaw` to `privateKeyJwkJson` to reflect
that the value is now a serialized JWK rather than a raw scalar.
Added service worker `/public/sw.js` and `src/lib/usePushNotifications.ts` hook (Phase 1b client side).

### 2026-06-15 — Initial creation (Phase 1b)

Implements the full VAPID + RFC 8291 stack using WebCrypto on Cloudflare
Workers. The module is gated behind env var presence so Phase 1a (in-app
feed) ships independently. The scheduler's `attemptPushForOwner()` lazy-
imports this module only when VAPID keys are configured, keeping the Phase 1a
bundle lean.

The `encryptPushAuth` / `decryptPushAuth` pair uses a distinct
`nanobee:push-auth:v1:` KEY_CONTEXT to prevent key derivation collisions with
the AI key vault (`nanobee:ai-api-key:v1:`), even though both are derived
from the same `AUTH_SECRET`.
