/**
 * Typed Hono RPC client.
 * Gives the frontend type-safe access to every /api endpoint.
 */

import { hc } from "hono/client";
import type { AppType } from "../worker/api-worker";

function getApiBaseUrl() {
	// Browser: same origin as the page
	if (typeof window !== "undefined") {
		return window.location.origin;
	}
	// SSR: not used on the server — server code calls D1/Hono directly
	return "";
}

/**
 * Type-safe API client (browser only).
 *
 * Usage:
 * ```typescript
 * const res = await apiClient.api.users.$get();
 * const data = await res.json();
 * ```
 */
export const apiClient = hc<AppType>(`${getApiBaseUrl()}/api`);

export type ApiClient = typeof apiClient;
