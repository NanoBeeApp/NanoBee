/**
 * Client-side Web Push subscription hook.
 *
 * Provides `usePushNotifications()` — a React hook that:
 * 1. Detects browser Push API support.
 * 2. Fetches the VAPID public key from GET /api/push/vapid-public-key.
 * 3. Registers the service worker at /sw.js (if not already registered).
 * 4. Calls `PushManager.subscribe()` with the VAPID key.
 * 5. POSTs the subscription to POST /api/push/subscribe.
 * 6. Tracks state: 'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported'.
 *
 * Phase 1b: push delivery requires VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY_ENC
 * to be configured on the server. When the VAPID key endpoint returns 503, the
 * hook gracefully stays in 'idle' state and subscribe() no-ops.
 *
 * Service worker registration note:
 * The service worker at /public/sw.js is a minimal push event handler.
 * In the current Vite/TanStack Start setup, files in public/ are served at the
 * root path. If Cloudflare Workers Assets intercepts /sw.js before returning
 * it, ensure the asset is bundled in dist/client/ (Vite copies public/ there).
 *
 * Cloudflare Workers deploy rule:
 * No nanoid() / Math.random() / Date.now() / new Date() at module top-level.
 * This file runs in the browser (not the Worker), so the rule does not apply
 * here, but we still avoid top-level state for SSR safety.
 */

import { useCallback, useEffect, useState } from "react";

export type PushState =
	| "idle"
	| "loading"
	| "subscribed"
	| "denied"
	| "unsupported";

export interface UsePushNotificationsReturn {
	/** Current subscription state. */
	state: PushState;
	/** Whether the browser supports Web Push at all. */
	isSupported: boolean;
	/**
	 * Request permission + subscribe to push notifications.
	 * Safe to call multiple times: re-subscribes on the server if the
	 * subscription endpoint changed, skips if already subscribed.
	 */
	subscribe: () => Promise<void>;
	/**
	 * Unsubscribe from push notifications.
	 * Removes the subscription from the server and browser.
	 */
	unsubscribe: () => Promise<void>;
	/** Last error message, if any. */
	error: string | null;
}

const SW_PATH = "/sw.js";
const API_BASE = "/api/push";

/** Fetch the VAPID public key from the server. Returns null when not configured. */
async function fetchVapidPublicKey(): Promise<string | null> {
	try {
		const res = await fetch(`${API_BASE}/vapid-public-key`);
		if (!res.ok) return null;
		const data = (await res.json()) as { publicKey?: string; error?: string };
		return data.publicKey ?? null;
	} catch {
		return null;
	}
}

/** Convert a base64url string to a Uint8Array (for applicationServerKey). */
function base64urlToUint8Array(base64url: string): Uint8Array {
	const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
	const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

/** Register (or get existing) service worker registration. */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
	if (!("serviceWorker" in navigator)) return null;
	try {
		// If already registered, return the existing registration.
		const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
		if (existing) return existing;
		// Register fresh.
		return await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
	} catch (err) {
		console.error("[push] service worker registration failed:", err);
		return null;
	}
}

/** POST the push subscription to the backend. */
async function postSubscription(sub: PushSubscription): Promise<boolean> {
	const json = sub.toJSON();
	if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
	try {
		const res = await fetch(`${API_BASE}/subscribe`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				endpoint: json.endpoint,
				p256dh: json.keys.p256dh,
				auth: json.keys.auth,
			}),
		});
		return res.ok;
	} catch {
		return false;
	}
}

/** DELETE the push subscription from the backend. */
async function deleteSubscription(endpoint: string): Promise<void> {
	try {
		await fetch(`${API_BASE}/subscribe`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ endpoint }),
		});
	} catch {
		// Best effort — if the server delete fails the subscription will expire naturally.
	}
}

export function usePushNotifications(): UsePushNotificationsReturn {
	const isSupported =
		typeof window !== "undefined" &&
		"serviceWorker" in navigator &&
		"PushManager" in window &&
		"Notification" in window;

	const [state, setState] = useState<PushState>(
		isSupported ? "idle" : "unsupported",
	);
	const [error, setError] = useState<string | null>(null);

	// On mount, check if we already have an active subscription.
	useEffect(() => {
		if (!isSupported) return;
		let cancelled = false;
		(async () => {
			const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
			if (!reg) return;
			const sub = await reg.pushManager.getSubscription();
			if (!cancelled && sub) {
				setState("subscribed");
			}
		})().catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, [isSupported]);

	const subscribe = useCallback(async () => {
		if (!isSupported) {
			setError("Push notifications are not supported in this browser.");
			return;
		}
		setState("loading");
		setError(null);

		try {
			// 1. Fetch VAPID public key.
			const vapidKey = await fetchVapidPublicKey();
			if (!vapidKey) {
				// Server not configured — silently fall back to idle.
				console.info("[push] VAPID not configured on server; skipping subscription.");
				setState("idle");
				return;
			}

			// 2. Request notification permission.
			const permission = await Notification.requestPermission();
			if (permission === "denied") {
				setState("denied");
				setError("Notification permission denied by the user.");
				return;
			}
			if (permission !== "granted") {
				setState("idle");
				return;
			}

			// 3. Register service worker.
			const reg = await getServiceWorkerRegistration();
			if (!reg) {
				setState("idle");
				setError("Service worker registration failed.");
				return;
			}

			// 4. Subscribe to push.
			// .slice() ensures a plain ArrayBuffer (not SharedArrayBuffer) for the
			// strict BufferSource typing in newer TypeScript DOM lib definitions.
			const sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: base64urlToUint8Array(vapidKey).slice(),
			});

			// 5. Send subscription to the server.
			const ok = await postSubscription(sub);
			if (!ok) {
				// Not a hard failure — the user's browser is subscribed even if
				// the server rejected the POST. Log and stay subscribed client-side.
				console.warn("[push] server rejected subscription POST (are you signed in?).");
			}

			setState("subscribed");
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error("[push] subscribe failed:", msg);
			setError(msg);
			setState("idle");
		}
	}, [isSupported]);

	const unsubscribe = useCallback(async () => {
		if (!isSupported) return;
		setState("loading");
		setError(null);

		try {
			const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
			if (!reg) {
				setState("idle");
				return;
			}
			const sub = await reg.pushManager.getSubscription();
			if (!sub) {
				setState("idle");
				return;
			}
			const endpoint = sub.endpoint;
			// Unsubscribe browser-side first.
			await sub.unsubscribe();
			// Then remove server-side (best effort).
			await deleteSubscription(endpoint);
			setState("idle");
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			console.error("[push] unsubscribe failed:", msg);
			setError(msg);
			setState("idle");
		}
	}, [isSupported]);

	return { state, isSupported, subscribe, unsubscribe, error };
}
