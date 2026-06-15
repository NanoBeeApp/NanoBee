# src/worker/routes/push.ts

## Purpose

Web Push subscription management endpoints mounted at `/api/push`.

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/vapid-public-key` | None | Returns `VAPID_PUBLIC_KEY` from env for use in `PushManager.subscribe({ applicationServerKey })` |
| `POST` | `/subscribe` | Session | Upsert a push subscription row; encrypts the auth secret before storage |
| `DELETE` | `/subscribe` | Session | Remove a push subscription row for the signed-in user |

### Security

- The push subscription `auth` secret is encrypted with AES-256-GCM before
  storage using `encryptPushAuth()` from `../push/vapid`. This uses a
  purpose-specific KEY_CONTEXT `'nanobee:push-auth:v1:'` distinct from the
  AI key context, preventing key derivation collisions.
- `p256dh` (the browser's DH public key) is not a secret and is stored plaintext.
- The endpoint URL is not a secret and is stored plaintext (used for lookups).
- Unauthenticated requests to `/subscribe` and `/delete` return 401.

### UNIQUE constraint handling

`INSERT ... ON CONFLICT(user_id, endpoint) DO UPDATE` means re-subscribing
after a service worker update silently refreshes `p256dh` and `auth_enc`
without duplicating the row.

## Dependencies

- `../push/vapid` — `encryptPushAuth`
- `../auth/cookies` — `getSessionToken`
- `../auth/store` — `getUserBySessionToken`
- `nanoid` — called inside handler body only (Workers deploy rule)

## Change history & rationale

### 2026-06-15 — Initial creation (Phase 1b)

Created alongside `push/vapid.ts` as the HTTP surface for Web Push
subscription management. The delivery side (`sendWebPush`) lives in
`vapid.ts` and is called by the scheduler engine, not these routes.

The three-endpoint design mirrors the Web Push best practice: the public key
is fetchable without auth (browsers need it before login), while subscribe/
unsubscribe require an authenticated session so subscriptions are always tied
to a specific user.
