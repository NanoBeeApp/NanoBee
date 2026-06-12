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

interface BootstrapBody {
	chats: { id: string; topicId: string; title: string }[];
	conversations: Record<string, { id: string; role: string }[]>;
	tasks: { id: string; status: string; next: string }[];
	updates: { id: string; unread: boolean }[];
}

async function getBootstrap(): Promise<BootstrapBody> {
	const res = await fetch(`${BASE_URL}/api/bootstrap`);
	expect(res.status).toBe(200);
	return (await res.json()) as BootstrapBody;
}

describe("bootstrap (D1, seeded)", () => {
	it("GET /api/bootstrap returns the seeded app state", async () => {
		const body = await getBootstrap();
		expect(body.chats.length).toBeGreaterThanOrEqual(7);
		expect(body.tasks.length).toBeGreaterThanOrEqual(5);
		expect(body.updates.length).toBeGreaterThanOrEqual(6);
		expect(body.conversations.c_gold_today?.length).toBeGreaterThanOrEqual(3);
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

describe("updates (D1)", () => {
	it("POST /api/updates/:id/read flips one read flag", async () => {
		const setRead = async (read: boolean) => {
			const res = await fetch(`${BASE_URL}/api/updates/u1/read`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ read }),
			});
			expect(res.status).toBe(200);
		};
		await setRead(true);
		let boot = await getBootstrap();
		expect(boot.updates.find((u) => u.id === "u1")?.unread).toBe(false);
		// Restore the demo's initial unread state.
		await setRead(false);
		boot = await getBootstrap();
		expect(boot.updates.find((u) => u.id === "u1")?.unread).toBe(true);
	});

	it("POST /api/updates/:id/read returns 404 for an unknown id", async () => {
		const res = await fetch(`${BASE_URL}/api/updates/u_nope/read`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ read: true }),
		});
		expect(res.status).toBe(404);
	});

	it("POST /api/updates/read-all marks everything read", async () => {
		const res = await fetch(`${BASE_URL}/api/updates/read-all`, { method: "POST" });
		expect(res.status).toBe(200);
		const boot = await getBootstrap();
		expect(boot.updates.every((u) => !u.unread)).toBe(true);
		// Restore u1/u2/u7 so the demo badge state survives the test run.
		for (const id of ["u1", "u2", "u7"]) {
			await fetch(`${BASE_URL}/api/updates/${id}/read`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ read: false }),
			});
		}
	});
});
