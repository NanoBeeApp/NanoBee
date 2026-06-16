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
		// Abort slow provider calls so the chat request never hangs. The default
		// DeepSeek V4 Flash is markedly slower than the previous Gemini default
		// (a long answer plus reasoning can run tens of seconds), so this leaves
		// headroom; a stuck call still aborts before a client would give up.
		REQUEST_TIMEOUT_MS: 60_000,
		// Ceiling on a single completion. This is the OpenAI-style "max
		// completion tokens", which for reasoning-capable models — and the
		// flash-tier defaults typically do reason — is shared by the hidden
		// reasoning trace AND the visible answer. It must therefore be generous
		// enough to leave room for the answer after reasoning, or replies get
		// truncated mid-sentence (finish_reason: "length"). It is a safety
		// ceiling, not a target length — answer brevity, if wanted, belongs in
		// the prompt, not in a tiny cap.
		MAX_COMPLETION_TOKENS: 4096,
		// Upper bound on user-supplied key / URL / model field lengths
		MAX_FIELD_LENGTH: 300,
	},

	// External public-data gateway (NanoBee-data-hub). The agent loop
	// discovers sources from its catalog and exposes them as tools.
	// Base URL comes from the DATA_HUB_URL binding; unset = no hub tools.
	DATA_HUB: {
		// Abort slow hub calls so a chat request never hangs on data fetching
		REQUEST_TIMEOUT_MS: 8_000,
	},

	// Agent loop settings (worker/agent/loop.ts)
	AGENT: {
		// Max model turns per request; the final turn is forced tool-free
		MAX_ITERATIONS: 5,
		// Per-tool execution timeout
		TOOL_TIMEOUT_MS: 20_000,
		// Tool results longer than this are truncated before re-prompting
		MAX_TOOL_RESULT_CHARS: 8_000,
		// Tool outputs stored in the persisted execution trace are kept shorter
		TRACE_MAX_OUTPUT_CHARS: 2_000,
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
