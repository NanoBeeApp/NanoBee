/**
 * Worker configuration.
 * Single place for backend constants — never hardcode these in route files.
 */

export const CONFIG = {
	// Prefix under which apiRoutes are mounted
	API_PREFIX: "/api",

	// CORS settings shared by all endpoints (arrays stay mutable for hono/cors)
	CORS: {
		origin: "*",
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
	},

	// Default page size for list endpoints
	DEFAULT_LIST_LIMIT: 50,

	// AI chat-completion settings (provider catalog lives in src/lib/ai-providers.ts;
	// the backend default is OpenRouter + DeepSeek V4 Flash via OPENROUTER_API_KEY)
	AI: {
		// Abort slow provider calls so the chat request never hangs
		REQUEST_TIMEOUT_MS: 30_000,
		// Hard cap on reply length (chat answers should stay short)
		MAX_COMPLETION_TOKENS: 800,
		// Upper bound on user-supplied key / URL / model field lengths
		MAX_FIELD_LENGTH: 300,
	},

	// External public-data gateway (NanoBee-data-hub). The chat pipeline
	// discovers sources from its catalog and pulls live data to ground replies.
	// Base URL comes from the DATA_HUB_URL binding; unset = augmentation off.
	DATA_HUB: {
		// Abort slow hub calls so a chat request never hangs on data fetching
		REQUEST_TIMEOUT_MS: 8_000,
		// Max sources offered to the router LLM (keeps the prompt bounded)
		MAX_SOURCES_IN_PROMPT: 40,
	},

	// Auth system constants (sessions, email codes, OAuth providers)
	AUTH: {
		// Name of the HttpOnly session cookie
		SESSION_COOKIE: "nb_session",
		// Sessions last 30 days
		SESSION_TTL_SECONDS: 60 * 60 * 24 * 30,
		// Email verification codes last 10 minutes
		EMAIL_CODE_TTL_SECONDS: 60 * 10,
		// Max wrong guesses before a code is invalidated
		EMAIL_CODE_MAX_ATTEMPTS: 5,
		// Max codes per email address per hour
		EMAIL_CODE_HOURLY_LIMIT: 5,
		// Signed OAuth state expires after 10 minutes
		OAUTH_STATE_TTL_MS: 10 * 60 * 1000,
		// Fallback sender when EMAIL_FROM is not configured
		DEFAULT_EMAIL_FROM: "NanoBee <noreply@nanobee.app>",
		// Password rules
		PASSWORD_MIN_LENGTH: 8,
		PASSWORD_MAX_LENGTH: 128,
		// OAuth provider endpoints
		PROVIDERS: {
			google: {
				authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
				tokenUrl: "https://oauth2.googleapis.com/token",
				userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
				scope: "openid email profile",
			},
			github: {
				authorizeUrl: "https://github.com/login/oauth/authorize",
				tokenUrl: "https://github.com/login/oauth/access_token",
				userInfoUrl: "https://api.github.com/user",
				emailsUrl: "https://api.github.com/user/emails",
				scope: "read:user user:email",
			},
		},
	},
};
