/**
 * Hono API worker.
 * Entry point for all backend endpoints and business logic.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { CONFIG } from "./config";
import { apiRoutes } from "./routes/api";

import type { D1Database } from "@cloudflare/workers-types";

// Cloudflare Workers bindings available to the API.
export type Env = {
	// D1 database (binding "DB" in wrangler.json)
	DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", logger());
app.use("*", cors(CONFIG.CORS));

// Mount business API routes under /api
app.route("/api", apiRoutes);

// Health check
app.get("/health", (c) => {
	return c.json({
		ok: true,
		timestamp: new Date().toISOString(),
	});
});

// Exported for the typed Hono RPC client (src/lib/api-client.ts)
export type AppType = typeof apiRoutes;

export default app;
