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

	// --- Auth secrets (wrangler secret / .dev.vars, never committed) ---
	// HMAC key for OAuth state signing (>= 32 random chars)
	AUTH_SECRET?: string;
	// Resend API key for verification emails
	RESEND_API_KEY?: string;
	// OAuth client credentials
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
	GITHUB_CLIENT_ID?: string;
	GITHUB_CLIENT_SECRET?: string;
	// Built-in OpenRouter key — the backend default AI provider
	// (Gemini 3.5 Flash) for users who haven't supplied their own key
	OPENROUTER_API_KEY?: string;
	// Built-in Tavily key — the default for the web-search tool when the
	// user hasn't entered their own key in the AI settings dialog
	TAVILY_API_KEY?: string;

	// --- Auth non-secret config (wrangler.json vars) ---
	// Sender address, e.g. "NanoBee <noreply@nanobee.app>"
	EMAIL_FROM?: string;
	// "1" logs verification codes to the console (local dev only)
	LOG_EMAIL_CODES?: string;

	// --- External data gateway (NanoBee-data-hub) ---
	// Base URL of the data hub, e.g. "http://localhost:3344" (dev) or
	// "https://data.nanobee.app" (deployed). Unset = no data-hub tools.
	DATA_HUB_URL?: string;
	// MCP servers for the agent loop, as JSON:
	//   {"datahub": "http://127.0.0.1:3344/mcp"}  or  [{"name":..., "url":...}]
	// Unset = no MCP tools.
	MCP_SERVERS?: string;
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
