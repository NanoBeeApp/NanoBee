/**
 * Custom server entry (referenced by wrangler.json "main").
 * Dispatches /api/* and /health to the Hono API worker; everything else is
 * handled by the default TanStack Start handler (SSR + server functions).
 */

import type { ExecutionContext } from "@cloudflare/workers-types";
import handler from "@tanstack/react-start/server-entry";
import apiWorker from "./worker/api-worker";
import type { Env } from "./worker/api-worker";

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname.startsWith("/api") || url.pathname === "/health") {
			return apiWorker.fetch(request, env, ctx);
		}

		// The published type only declares (request), but at runtime the
		// Start handler passes all worker arguments through — forward them
		// so bindings stay available to server functions.
		return (handler.fetch as (...args: unknown[]) => Promise<Response>)(
			request,
			env,
			ctx,
		);
	},
};
