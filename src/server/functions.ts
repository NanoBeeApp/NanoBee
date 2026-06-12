/**
 * TanStack Start server functions.
 * Lightweight RPC alternative to the Hono /api endpoints for
 * SSR-friendly data fetching.
 */

import { createServerFn } from "@tanstack/react-start";

// Smoke-test server function (mirrors GET /api/hello)
export const getHello = createServerFn({ method: "GET" })
	.inputValidator((input: { name?: string }) => input)
	.handler(async ({ data }) => {
		const name = data?.name || "World";
		return { message: `Hello, ${name}!` as const };
	});

// Health info rendered during SSR
export const getHealth = createServerFn({ method: "GET" }).handler(async () => {
	return { ok: true, timestamp: new Date().toISOString() };
});
