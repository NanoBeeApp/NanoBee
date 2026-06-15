/**
 * NanoBee Service Worker — minimal push notification handler.
 *
 * This service worker handles Web Push `push` events from the server (sent by
 * the scheduler cron after a task trigger fires) and shows a browser
 * notification via `self.registration.showNotification()`.
 *
 * The payload is a JSON-encoded object: { title: string, body: string }.
 *
 * Phase 1b: this file is intentionally minimal. Future iterations can add
 * offline caching (install/fetch events) and notification action buttons.
 *
 * Registration: src/lib/usePushNotifications.ts registers this SW at
 * navigator.serviceWorker.register('/sw.js', { scope: '/' }).
 *
 * Cloudflare Assets: place this file in public/ — Vite copies public/ to
 * dist/client/, which is the Cloudflare Assets directory configured in
 * wrangler.json. The asset is served by Cloudflare's static asset handler
 * before the Worker script runs, so /sw.js is always reachable.
 */

/* global self */

self.addEventListener("push", (event) => {
	/** @type {PushEvent} */
	const pushEvent = event;

	let title = "NanoBee";
	let body = "You have a new update.";
	let icon = "/favicon.svg";

	if (pushEvent.data) {
		try {
			const data = pushEvent.data.json();
			if (typeof data.title === "string" && data.title) title = data.title;
			if (typeof data.body === "string" && data.body) body = data.body;
		} catch {
			// Non-JSON payload — use the raw text as the body.
			body = pushEvent.data.text() || body;
		}
	}

	pushEvent.waitUntil(
		self.registration.showNotification(title, {
			body,
			icon,
			badge: "/favicon.svg",
			tag: "nanobee-update",      // collapses duplicate notifications
			renotify: true,             // vibrate/sound even when replacing a tag
			data: { url: self.location.origin },
		}),
	);
});

self.addEventListener("notificationclick", (event) => {
	/** @type {NotificationEvent} */
	const clickEvent = event;
	clickEvent.notification.close();

	const targetUrl =
		(clickEvent.notification.data && clickEvent.notification.data.url) ||
		self.location.origin;

	clickEvent.waitUntil(
		// Focus existing tab if already open, otherwise open a new one.
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clients) => {
				for (const client of clients) {
					if (client.url === targetUrl && "focus" in client) {
						return client.focus();
					}
				}
				return self.clients.openWindow(targetUrl);
			}),
	);
});
