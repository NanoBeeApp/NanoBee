# src/worker/ai/crypto.ts

## Responsibility
At-rest encryption for user-supplied AI API keys: AES-256-GCM via WebCrypto,
with the AES key derived from `AUTH_SECRET` (SHA-256 over a purpose-specific
prefix + secret). Output format is self-describing: `v1$<iv>$<ciphertext>`
(base64url), so the scheme can be rotated later.

## Core exports / API
- `encryptSecret(plaintext, secret)` → `"v1$iv$ct"` string
- `decryptSecret(stored, secret)` → plaintext or `null` (invalid/tampered)

## Dependencies
- Upstream: `worker/auth/crypto.ts` (base64url helpers), WebCrypto
- Downstream: `worker/ai/settings.ts`

## Notes
- A leaked D1 dump alone cannot reveal stored provider keys; the attacker
  would also need `AUTH_SECRET` (a wrangler secret, never in the database).
- `KEY_CONTEXT` binds the derived key to this purpose so future uses of
  `AUTH_SECRET` as key material can't collide.

## Change history

### 2026-06-12 — created
- **Motivation**: the AI provider settings feature stores third-party API
  keys; persisting them in plaintext in D1 was ruled out as an unacceptable
  security posture for a public product.
- **Key decision**: derive the AES key from the existing `AUTH_SECRET`
  instead of introducing a second secret — one less operational knob, and
  the secret is already mandatory for auth flows.
