/**
 * API integration tests for the Hono worker (D1-backed).
 * Requires a running dev server: `pnpm db:migrate:local && pnpm dev`.
 */

import { describe, expect, it } from "vitest";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5173";

describe("health & hello", () => {
	it("GET /health returns ok", async () => {
		const res = await fetch(`${BASE_URL}/health`);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { ok: boolean };
		expect(body.ok).toBe(true);
	});

	it("GET /api/hello echoes the name", async () => {
		const res = await fetch(`${BASE_URL}/api/hello?name=NanoBee`);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { message: string };
		expect(body.message).toBe("Hello, NanoBee!");
	});
});

describe("users (D1)", () => {
	const email = `test-${Date.now()}@nanobee.test`;

	it("POST /api/users creates a user", async () => {
		const res = await fetch(`${BASE_URL}/api/users`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Test User", email }),
		});
		expect(res.status).toBe(201);
		const body = (await res.json()) as {
			user: { id: number; email: string };
		};
		expect(body.user.email).toBe(email);
	});

	it("POST /api/users rejects a duplicate email with 409", async () => {
		const res = await fetch(`${BASE_URL}/api/users`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Test User", email }),
		});
		expect(res.status).toBe(409);
	});

	it("POST /api/users rejects an invalid body with 400", async () => {
		const res = await fetch(`${BASE_URL}/api/users`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "", email: "not-an-email" }),
		});
		expect(res.status).toBe(400);
	});

	it("GET /api/users lists the created user", async () => {
		const res = await fetch(`${BASE_URL}/api/users`);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { users: { email: string }[] };
		expect(body.users.some((u) => u.email === email)).toBe(true);
	});
});
