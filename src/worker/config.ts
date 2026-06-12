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
};
