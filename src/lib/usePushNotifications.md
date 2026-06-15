# src/lib/usePushNotifications.ts

## Purpose

Client-side React hook for Web Push notification subscription management
(Phase 1b of the proactive notification delivery system).

### `usePushNotifications()` return value

| Field | Type | Description |
|---|---|---|
| `state` | `PushState` | `'idle' \| 'loading' \| 'subscribed' \| 'denied' \| 'unsupported'` |
| `isSupported` | `boolean` | `true` when the browser supports Service Workers + PushManager |
| `subscribe()` | `async () => void` | Request permission, register SW, subscribe to push, POST to backend |
| `unsubscribe()` | `async () => void` | Unsubscribe from push, DELETE from backend |
| `error` | `string \| null` | Last error message, if any |

### State transitions

```
unsupported  (non-supporting browsers — permanent)

idle
  → loading (subscribe() or unsubscribe() called)
  → subscribed (subscribe() succeeded)
  → denied (user denied permission)
  → idle (subscribe() found no VAPID key, or unsubscribe() completed)

subscribed
  → loading → idle (unsubscribe())
```

### VAPID key detection

`subscribe()` first calls `GET /api/push/vapid-public-key`. If the server
returns 503 (push not configured), the hook silently stays `idle` — it
never throws or shows an error to the user. This makes the hook safe to
mount unconditionally in the app shell without checking server configuration
in advance.

### Service worker

The hook registers `/sw.js` as a service worker with `scope: "/"`. The SW
must be served at the root of the origin. In the Vite/TanStack Start +
Cloudflare Assets setup, place the file at `public/sw.js` — Vite copies
`public/` to `dist/client/` which is the Cloudflare Assets directory.

### Security notes

- The hook only runs in the browser (SSR-safe: all `window`/`navigator` access
  is guarded by `typeof window !== "undefined"` or the `isSupported` flag).
- The push auth secret (`keys.auth` from `PushSubscription.toJSON()`) is sent
  over HTTPS to `POST /api/push/subscribe` where it is AES-256-GCM encrypted
  before storage. It never appears in logs.
- `POST /api/push/subscribe` returns 401 when the user is not signed in.
  The hook logs a warning but still marks the state `subscribed` client-side
  (the browser subscription is still valid and the user can sign in later).

## Dependencies

- React `useState`, `useEffect`, `useCallback`
- Browser APIs: `navigator.serviceWorker`, `PushManager`, `Notification`
- `/api/push/*` backend endpoints (see `src/worker/routes/push.ts`)

## Change history & rationale

### 2026-06-15 — Initial creation (Phase 1b)

Created to wire the backend push endpoints to the React UI.
The hook encapsulates all complexity of the Push API (feature detection,
service worker registration, subscription lifecycle, server sync) behind
a simple `{ state, subscribe, unsubscribe }` interface so any component
can opt in to push notifications with a single hook call.

Service worker registration is embedded in the hook rather than being a
separate app-shell concern, keeping the surface minimal for Phase 1b.
A future refactor can extract SW registration to a shared app-level init
if other SW features (e.g. offline caching) are added.
