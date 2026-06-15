/**
 * Custom server entry (referenced by wrangler.json "main").
 * Dispatches /api/* and /health to the Hono API worker; everything else is
 * handled by the default TanStack Start handler (SSR + server functions).
 *
 * Also exports a scheduled() handler for Cloudflare cron triggers (every 15 minutes).
 * The scheduled handler delegates to the pure rules-based task scheduling engine
 * (no LLM calls, no user API keys).
 */

import type { ExecutionContext, ScheduledEvent } from "@cloudflare/workers-types";
import handler from "@tanstack/react-start/server-entry";
import apiWorker from "./worker/api-worker";
import type { Env } from "./worker/api-worker";
import { runScheduler } from "./worker/scheduler/engine";

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

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		console.log("[scheduled] cron tick:", event.cron, "at", event.scheduledTime);
		ctx.waitUntil(runScheduler(env));
	},
};
