/**
 * Auth router: combines email/password, OAuth and session sub-routers.
 * Mounted at /api/auth by routes/api.ts (chained for typed RPC inference).
 * The OAuth callback path (/api/auth/<provider>/callback) must stay in sync
 * with the redirect URIs registered in the provider consoles.
 */

import { Hono } from "hono";
import type { Env } from "../../api-worker";
import { accountRoutes } from "./account";
import { emailAuthRoutes } from "./email";
import { oauthRoutes } from "./oauth";
import { sessionRoutes } from "./session";

export const authRoutes = new Hono<{ Bindings: Env }>()
	.route("/", emailAuthRoutes)
	.route("/", sessionRoutes)
	.route("/", oauthRoutes)
	.route("/", accountRoutes);
