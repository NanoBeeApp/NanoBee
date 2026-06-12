/**
 * Auth router: combines email/password, OAuth and session sub-routers.
 * Mounted at /api/auth by routes/api.ts (chained for typed RPC inference).
 */

import { Hono } from "hono";
import type { Env } from "../../api-worker";
import { emailAuthRoutes } from "./email";
import { oauthRoutes } from "./oauth";
import { sessionRoutes } from "./session";

export const authRoutes = new Hono<{ Bindings: Env }>()
	.route("/", emailAuthRoutes)
	.route("/", sessionRoutes)
	.route("/", oauthRoutes);
