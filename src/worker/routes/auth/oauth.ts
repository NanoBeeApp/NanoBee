/**
 * Google / GitHub OAuth routes (authorization-code flow).
 * Mounted at /api/auth — the callback path must stay in sync with the
 * redirect URIs registered in the providers' consoles
 * (…/api/auth/<provider>/callback).
 * GET /:provider/start builds the consent URL with an HMAC-signed state;
 * GET /:provider/callback exchanges the code, resolves the user
 * (link-by-verified-email or create) and sets the session cookie.
 */

import { Hono } from "hono";
import { CONFIG } from "../../config";
import type { Env } from "../../api-worker";
import { randomToken, signOAuthState, verifyOAuthState } from "../../auth/crypto";
import { setSessionCookie } from "../../auth/cookies";
import {
	createSession,
	createUser,
	enrichUserProfile,
	findAccount,
	findUserByEmail,
	getUserById,
	linkAccount,
	markEmailVerified,
} from "../../auth/store";

type Provider = "google" | "github";

/** Normalized profile every provider resolves to. */
type OAuthProfile = {
	providerAccountId: string;
	email: string | null;
	emailVerified: boolean;
	name: string;
	image: string | null;
};

function getProviderConfig(c: { env: Env }, provider: Provider) {
	const clientId =
		provider === "google" ? c.env.GOOGLE_CLIENT_ID : c.env.GITHUB_CLIENT_ID;
	const clientSecret =
		provider === "google" ? c.env.GOOGLE_CLIENT_SECRET : c.env.GITHUB_CLIENT_SECRET;
	if (!clientId || !clientSecret) return null;
	return { ...CONFIG.AUTH.PROVIDERS[provider], clientId, clientSecret };
}

function isProvider(value: string): value is Provider {
	return value === "google" || value === "github";
}

/** Only allow same-origin relative paths to prevent open redirects. */
function safeReturnTo(value: string | undefined): string {
	if (value && value.startsWith("/") && !value.startsWith("//")) return value;
	return "/";
}

function loginErrorRedirect(c: { redirect: (url: string, status: 302) => Response }, code: string) {
	return c.redirect(`/login?error=${encodeURIComponent(code)}`, 302);
}

async function exchangeCode(
	provider: Provider,
	config: { tokenUrl: string; clientId: string; clientSecret: string },
	code: string,
	redirectUri: string,
): Promise<string | null> {
	const res = await fetch(config.tokenUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json",
		},
		body: new URLSearchParams({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			code,
			redirect_uri: redirectUri,
			grant_type: "authorization_code",
		}),
	});
	if (!res.ok) {
		console.error(`[AUTH] ${provider} token exchange failed: ${res.status} ${await res.text()}`);
		return null;
	}
	const data = (await res.json()) as { access_token?: string };
	return data.access_token ?? null;
}

async function fetchGoogleProfile(
	userInfoUrl: string,
	accessToken: string,
): Promise<OAuthProfile | null> {
	const res = await fetch(userInfoUrl, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok) {
		console.error(`[AUTH] google userinfo failed: ${res.status}`);
		return null;
	}
	const data = (await res.json()) as {
		sub: string;
		email?: string;
		email_verified?: boolean;
		name?: string;
		picture?: string;
	};
	return {
		providerAccountId: data.sub,
		email: data.email?.toLowerCase() ?? null,
		emailVerified: data.email_verified === true,
		name: data.name ?? "",
		image: data.picture ?? null,
	};
}

async function fetchGitHubProfile(
	userInfoUrl: string,
	emailsUrl: string,
	accessToken: string,
): Promise<OAuthProfile | null> {
	const headers = {
		Authorization: `Bearer ${accessToken}`,
		Accept: "application/vnd.github+json",
		// GitHub's API rejects requests without a User-Agent.
		"User-Agent": "nanobee-auth",
	};
	const res = await fetch(userInfoUrl, { headers });
	if (!res.ok) {
		console.error(`[AUTH] github user fetch failed: ${res.status}`);
		return null;
	}
	const data = (await res.json()) as {
		id: number;
		login: string;
		name?: string | null;
		email?: string | null;
		avatar_url?: string;
	};

	let email = data.email?.toLowerCase() ?? null;
	let emailVerified = false;
	// The public profile email is often empty; ask the emails endpoint
	// for the primary verified address.
	const emailsRes = await fetch(emailsUrl, { headers });
	if (emailsRes.ok) {
		const emails = (await emailsRes.json()) as {
			email: string;
			primary: boolean;
			verified: boolean;
		}[];
		const primary =
			emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
		if (primary) {
			email = primary.email.toLowerCase();
			emailVerified = true;
		}
	}

	return {
		providerAccountId: String(data.id),
		email,
		emailVerified,
		name: data.name ?? data.login,
		image: data.avatar_url ?? null,
	};
}

/** Find or create the local user for an OAuth profile and link the account. */
async function resolveOAuthUser(
	env: Env,
	provider: Provider,
	profile: OAuthProfile,
): Promise<string> {
	const linked = await findAccount(env.DB, provider, profile.providerAccountId);
	if (linked) {
		await enrichUserProfile(env.DB, linked.userId, {
			name: profile.name,
			image: profile.image,
		});
		return linked.userId;
	}

	// Merge with an existing account only on a provider-verified email,
	// otherwise an attacker could claim someone's address to hijack it.
	if (profile.email && profile.emailVerified) {
		const existing = await findUserByEmail(env.DB, profile.email);
		if (existing) {
			await linkAccount(env.DB, {
				userId: existing.id,
				provider,
				providerAccountId: profile.providerAccountId,
				email: profile.email,
			});
			await markEmailVerified(env.DB, existing.id);
			await enrichUserProfile(env.DB, existing.id, {
				name: profile.name,
				image: profile.image,
			});
			return existing.id;
		}
	}

	const user = await createUser(env.DB, {
		// GitHub may hide the email entirely; store a placeholder identity.
		email: profile.email ?? `${provider}_${profile.providerAccountId}@users.noreply.nanobee`,
		name: profile.name,
		image: profile.image,
		emailVerified: profile.emailVerified,
	});
	await linkAccount(env.DB, {
		userId: user.id,
		provider,
		providerAccountId: profile.providerAccountId,
		email: profile.email,
	});
	return user.id;
}

export const oauthRoutes = new Hono<{ Bindings: Env }>()
	// GET /api/auth/:provider/start — redirect to the provider consent page
	.get("/:provider/start", async (c) => {
		const provider = c.req.param("provider");
		if (!isProvider(provider)) return c.json({ error: "unknown_provider" }, 404);
		console.log(`[AUTH] GET /${provider}/start`);

		const config = getProviderConfig(c, provider);
		if (!config) return c.json({ error: "provider_not_configured" }, 501);
		if (!c.env.AUTH_SECRET) return c.json({ error: "auth_secret_missing" }, 500);

		const origin = new URL(c.req.url).origin;
		const state = await signOAuthState(
			{
				provider,
				returnTo: safeReturnTo(c.req.query("returnTo")),
				nonce: randomToken(),
				issuedAt: Date.now(),
			},
			c.env.AUTH_SECRET,
		);

		const url = new URL(config.authorizeUrl);
		url.searchParams.set("client_id", config.clientId);
		url.searchParams.set("redirect_uri", `${origin}/api/auth/${provider}/callback`);
		url.searchParams.set("response_type", "code");
		url.searchParams.set("scope", config.scope);
		url.searchParams.set("state", state);
		return c.redirect(url.toString(), 302);
	})

	// GET /api/auth/:provider/callback — code exchange + session
	.get("/:provider/callback", async (c) => {
		const provider = c.req.param("provider");
		if (!isProvider(provider)) return c.json({ error: "unknown_provider" }, 404);
		console.log(`[AUTH] GET /${provider}/callback`);

		const config = getProviderConfig(c, provider);
		if (!config || !c.env.AUTH_SECRET) return loginErrorRedirect(c, "provider_not_configured");

		const stateRaw = c.req.query("state") ?? "";
		const state = await verifyOAuthState(
			stateRaw,
			c.env.AUTH_SECRET,
			CONFIG.AUTH.OAUTH_STATE_TTL_MS,
		);
		if (!state || state.provider !== provider) {
			console.error(`[AUTH] ${provider} callback: invalid state`);
			return loginErrorRedirect(c, "invalid_state");
		}

		const code = c.req.query("code");
		if (!code) {
			// User denied consent (or the provider returned an error).
			console.warn(`[AUTH] ${provider} callback without code: ${c.req.query("error")}`);
			return loginErrorRedirect(c, "oauth_denied");
		}

		const origin = new URL(c.req.url).origin;
		const accessToken = await exchangeCode(
			provider,
			config,
			code,
			`${origin}/api/auth/${provider}/callback`,
		);
		if (!accessToken) return loginErrorRedirect(c, "oauth_exchange_failed");

		const profile =
			provider === "google"
				? await fetchGoogleProfile(config.userInfoUrl, accessToken)
				: await fetchGitHubProfile(
						config.userInfoUrl,
						CONFIG.AUTH.PROVIDERS.github.emailsUrl,
						accessToken,
					);
		if (!profile) return loginErrorRedirect(c, "oauth_profile_failed");

		const userId = await resolveOAuthUser(c.env, provider, profile);
		const user = await getUserById(c.env.DB, userId);
		if (!user) return loginErrorRedirect(c, "user_resolve_failed");

		const session = await createSession(c.env.DB, userId, {
			ip: c.req.header("cf-connecting-ip"),
			userAgent: c.req.header("user-agent"),
		});
		setSessionCookie(c, session.token, session.expiresAt);
		console.log(`[AUTH] ${provider} login ok user=${userId}`);
		return c.redirect(state.returnTo, 302);
	});
