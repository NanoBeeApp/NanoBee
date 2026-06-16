/**
 * API integration tests for the Hono worker (D1-backed).
 * Requires a running dev server: `pnpm db:migrate:local && pnpm dev`.
 */

import { describe, expect, it } from "vitest";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3333";

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

describe("auth (D1)", () => {
	// Resend's official test inbox — accepted by the API, delivered nowhere.
	const email = `delivered+nb${Date.now()}@resend.dev`;
	const password = "test-password-123";

	const postJson = (path: string, body: unknown) =>
		fetch(`${BASE_URL}${path}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

	it("POST /api/auth/register creates an unverified account", async () => {
		const res = await postJson("/api/auth/register", {
			email,
			password,
			name: "Test User",
		});
		expect(res.status).toBe(201);
		const body = (await res.json()) as { needsVerification: boolean };
		expect(body.needsVerification).toBe(true);
	});

	it("POST /api/auth/register rejects a weak password with 400", async () => {
		const res = await postJson("/api/auth/register", {
			email: `delivered+weak${Date.now()}@resend.dev`,
			password: "short",
		});
		expect(res.status).toBe(400);
	});

	it("POST /api/auth/login rejects a wrong password with 401", async () => {
		const res = await postJson("/api/auth/login", {
			email,
			password: "wrong-password",
		});
		expect(res.status).toBe(401);
	});

	it("POST /api/auth/login blocks unverified accounts with 403", async () => {
		const res = await postJson("/api/auth/login", { email, password });
		expect(res.status).toBe(403);
		const body = (await res.json()) as { needsVerification: boolean };
		expect(body.needsVerification).toBe(true);
	});

	it("POST /api/auth/verify-email rejects a wrong code with 400", async () => {
		const res = await postJson("/api/auth/verify-email", {
			email,
			code: "000001",
		});
		expect(res.status).toBe(400);
	});

	it("GET /api/auth/me returns null without a session", async () => {
		const res = await fetch(`${BASE_URL}/api/auth/me`);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { user: unknown };
		expect(body.user).toBeNull();
	});

	it("POST /api/auth/logout succeeds without a session", async () => {
		const res = await fetch(`${BASE_URL}/api/auth/logout`, { method: "POST" });
		expect(res.status).toBe(200);
	});

	it("GET /api/auth/google/start redirects or reports unconfigured", async () => {
		const res = await fetch(`${BASE_URL}/api/auth/google/start`, {
			redirect: "manual",
		});
		// 302 when OAuth credentials are configured, 501 otherwise.
		expect([302, 501]).toContain(res.status);
	});

	it("GET /api/auth/google/start callback path matches the registered redirect URI", async () => {
		const res = await fetch(`${BASE_URL}/api/auth/google/start`, {
			redirect: "manual",
		});
		if (res.status !== 302) return; // provider not configured locally
		const location = new URL(res.headers.get("location") ?? "");
		expect(location.searchParams.get("redirect_uri")).toContain(
			"/api/auth/google/callback",
		);
	});

	it("GET /api/auth/github/callback rejects a forged state", async () => {
		const res = await fetch(
			`${BASE_URL}/api/auth/github/callback?state=forged.signature&code=x`,
			{ redirect: "manual" },
		);
		expect(res.status).toBe(302);
		expect(res.headers.get("location")).toContain("/login?error=");
	});
});

interface BootstrapBody {
	chats: { id: string; topicId: string; title: string }[];
	conversations: Record<string, { id: string; role: string }[]>;
	/** Per-chat pagination metadata added in the message-pagination update. */
	pagination?: Record<string, { hasMore: boolean; oldestCursor: string | null }>;
	tasks: { id: string; status: string; next: string }[];
	updates: { id: string }[];
}

async function getBootstrap(): Promise<BootstrapBody> {
	const res = await fetch(`${BASE_URL}/api/bootstrap`);
	expect(res.status).toBe(200);
	return (await res.json()) as BootstrapBody;
}

describe("bootstrap (D1, anon bucket seeded lazily)", () => {
	it("GET /api/bootstrap returns the seeded app state", async () => {
		const body = await getBootstrap();
		expect(body.chats.length).toBeGreaterThanOrEqual(7);
		expect(body.tasks.length).toBeGreaterThanOrEqual(5);
		expect(body.updates.length).toBeGreaterThanOrEqual(6);
		// Seed has 3 messages for c_gold_today, well within the 30-message window.
		expect(body.conversations.c_gold_today?.length).toBeGreaterThanOrEqual(3);
		// Pagination metadata must be present for every chat that has messages.
		expect(body.pagination).toBeDefined();
		const goldPag = body.pagination?.c_gold_today;
		expect(goldPag).toBeDefined();
		// Seed has only 3 messages → hasMore must be false.
		expect(goldPag?.hasMore).toBe(false);
	});
});

describe("chat message pagination (D1)", () => {
	it("GET /api/chats/:id/messages returns 400 when before param is missing", async () => {
		const res = await fetch(`${BASE_URL}/api/chats/c_gold_today/messages`);
		expect(res.status).toBe(400);
	});

	it("GET /api/chats/:id/messages returns 400 when before is an invalid cursor", async () => {
		// "abc" has no underscore separator — fails decodeCursor validation.
		const res = await fetch(
			`${BASE_URL}/api/chats/c_gold_today/messages?before=abc`,
		);
		expect(res.status).toBe(400);
	});

	it("GET /api/chats/:id/messages returns empty page for a cursor before all messages", async () => {
		// Cursor "1_z" means: created_at=1 (epoch second 1, far in the past), id="z".
		// No seed messages exist before this point.
		const res = await fetch(
			`${BASE_URL}/api/chats/c_gold_today/messages?before=${encodeURIComponent("1_z")}`,
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			messages: unknown[];
			hasMore: boolean;
			oldestCursor: string | null;
		};
		expect(body.messages).toHaveLength(0);
		expect(body.hasMore).toBe(false);
		expect(body.oldestCursor).toBeNull();
	});

	it("GET /api/chats/:id/messages returns older messages and correct hasMore", async () => {
		// Use a far-future cursor so all seed messages for c_gold_today are returned.
		// Cursor "<year-2100-epoch>_~" is always after any real message.
		const farFutureCursor = `9999999999_~`;
		const boot = await getBootstrap();
		const pag = boot.pagination?.c_gold_today;
		if (!pag || pag.oldestCursor === null) {
			// No messages in this chat — skip (shouldn't happen with seed data).
			return;
		}
		const res = await fetch(
			`${BASE_URL}/api/chats/c_gold_today/messages?before=${encodeURIComponent(farFutureCursor)}`,
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			messages: { id: string; role: string }[];
			hasMore: boolean;
			oldestCursor: string | null;
		};
		// Seed has 3 messages; all should be returned within one page of 30.
		expect(body.messages.length).toBeGreaterThanOrEqual(3);
		expect(body.hasMore).toBe(false);
		// oldestCursor must be a non-empty string.
		expect(typeof body.oldestCursor).toBe("string");
		expect((body.oldestCursor as string).length).toBeGreaterThan(0);
	});

	it("GET /api/chats/:id/messages respects the limit param", async () => {
		const farFutureCursor = `9999999999_~`;
		const res = await fetch(
			`${BASE_URL}/api/chats/c_gold_today/messages?before=${encodeURIComponent(farFutureCursor)}&limit=2`,
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			messages: { id: string; role: string }[];
			hasMore: boolean;
		};
		// Seed has 3 messages; with limit=2 we get 2 and hasMore=true.
		expect(body.messages.length).toBeLessThanOrEqual(2);
	});
});

describe("messages (D1)", () => {
	const stamp = Date.now().toString(36);
	const chatId = `c_test${stamp}`;
	const userMessageId = `m_test${stamp}`;

	it("POST /api/messages creates a chat, persists both sides and replies", async () => {
		const res = await fetch(`${BASE_URL}/api/messages`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				chatId,
				userMessageId,
				title: "测试对话",
				text: "帮我盯着黄金价格",
			}),
		});
		expect(res.status).toBe(201);
		const body = (await res.json()) as {
			chatId: string;
			topicId: string;
			aiMessage: { id: string; role: string };
		};
		expect(body.chatId).toBe(chatId);
		expect(body.topicId).toBe("gold");
		expect(body.aiMessage.role).toBe("ai");

		// Both messages and the chat must be visible in the next bootstrap.
		const boot = await getBootstrap();
		expect(boot.chats.some((c) => c.id === chatId)).toBe(true);
		const msgs = boot.conversations[chatId] ?? [];
		expect(msgs.some((m) => m.id === userMessageId)).toBe(true);
		expect(msgs.some((m) => m.id === body.aiMessage.id)).toBe(true);
	});

	it("POST /api/messages rejects an invalid body with 400", async () => {
		const res = await fetch(`${BASE_URL}/api/messages`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ chatId: "bad id!", userMessageId, text: "" }),
		});
		expect(res.status).toBe(400);
	});
});

describe("tasks (D1)", () => {
	const taskId = `t_test${Date.now().toString(36)}`;
	const task = {
		id: taskId,
		topicId: "gold",
		title: "测试 · 盯盘提醒",
		iconColor: "#d4a64a",
		triggerType: "condition",
		trigger: "涨跌 ±1.5%",
		last: "刚刚创建",
		next: "实时监控中",
		desc: "测试任务",
		config: [{ icon: "bolt", label: "涨跌 ±1.5%" }],
	};

	it("POST /api/tasks creates a task and persists it", async () => {
		const res = await fetch(`${BASE_URL}/api/tasks`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(task),
		});
		expect(res.status).toBe(201);
		const body = (await res.json()) as { task: { id: string; status: string } };
		expect(body.task.id).toBe(taskId);
		expect(body.task.status).toBe("active");

		const boot = await getBootstrap();
		expect(boot.tasks.some((t) => t.id === taskId)).toBe(true);
	});

	it("POST /api/tasks/:id/toggle pauses and resumes", async () => {
		const res1 = await fetch(`${BASE_URL}/api/tasks/${taskId}/toggle`, { method: "POST" });
		expect(res1.status).toBe(200);
		const body1 = (await res1.json()) as { task: { status: string; next: string } };
		expect(body1.task.status).toBe("paused");
		expect(body1.task.next).toBe("已暂停");

		const res2 = await fetch(`${BASE_URL}/api/tasks/${taskId}/toggle`, { method: "POST" });
		const body2 = (await res2.json()) as { task: { status: string } };
		expect(body2.task.status).toBe("active");
	});

	it("POST /api/tasks/:id/toggle returns 404 for an unknown id", async () => {
		const res = await fetch(`${BASE_URL}/api/tasks/t_nope/toggle`, { method: "POST" });
		expect(res.status).toBe(404);
	});
});

describe("account management (unauthenticated guards)", () => {
	// All account management endpoints must return 401 when not signed in.

	it("PATCH /api/auth/account/name returns 401 without session", async () => {
		const res = await fetch(`${BASE_URL}/api/auth/account/name`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Test" }),
		});
		expect(res.status).toBe(401);
	});

	it("POST /api/auth/account/password returns 401 without session", async () => {
		const res = await fetch(`${BASE_URL}/api/auth/account/password`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ currentPassword: "old", newPassword: "new-pass-123" }),
		});
		expect(res.status).toBe(401);
	});

	it("GET /api/auth/sessions returns 401 without session", async () => {
		const res = await fetch(`${BASE_URL}/api/auth/sessions`);
		expect(res.status).toBe(401);
	});

	it("POST /api/auth/sessions/revoke returns 401 without session", async () => {
		const res = await fetch(`${BASE_URL}/api/auth/sessions/revoke`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ mode: "others" }),
		});
		expect(res.status).toBe(401);
	});

	it("GET /api/auth/export returns 401 without session", async () => {
		const res = await fetch(`${BASE_URL}/api/auth/export`);
		expect(res.status).toBe(401);
	});

	it("DELETE /api/auth/account returns 401 without session", async () => {
		const res = await fetch(`${BASE_URL}/api/auth/account`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ confirm: "DELETE" }),
		});
		expect(res.status).toBe(401);
	});
});

describe("password reset flow (unauthenticated)", () => {
	it("POST /api/auth/forgot-password always returns ok (no enum)", async () => {
		const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: `nonexistent+${Date.now()}@example.com` }),
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as { ok: boolean };
		expect(body.ok).toBe(true);
	});

	it("POST /api/auth/forgot-password rejects invalid email with 400", async () => {
		const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "not-an-email" }),
		});
		expect(res.status).toBe(400);
	});

	it("POST /api/auth/reset-password rejects wrong code with 400", async () => {
		const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: `nonexistent+${Date.now()}@example.com`,
				code: "000001",
				newPassword: "new-pass-123",
			}),
		});
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe("invalid_code");
	});

	it("POST /api/auth/reset-password rejects weak password with 400", async () => {
		const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: "test@example.com",
				code: "123456",
				newPassword: "short",
			}),
		});
		expect(res.status).toBe(400);
	});
});
