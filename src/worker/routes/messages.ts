/**
 * POST /api/messages — the chat send pipeline.
 * Persists the user's message, creates the chat row when it is new,
 * generates the AI reply server-side, persists it and returns it.
 * The client renders its own message optimistically and supplies the ids,
 * so what it shows is exactly what lands in D1.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../api-worker";
import type { AgentTrace } from "../../lib/agent-trace";
import { resolveAiConfig, resolveWebSearchKey } from "../ai/settings";
import { runAgentLoop } from "../agent/loop";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";
import { ensureSeeded } from "../db/seed";
import { genReply } from "../reply";

const ID_PATTERN = /^[a-z]+_[A-Za-z0-9_-]{4,40}$/;

const sendSchema = z.object({
	chatId: z.string().regex(ID_PATTERN, "Invalid chat id"),
	userMessageId: z.string().regex(ID_PATTERN, "Invalid message id"),
	title: z.string().min(1).max(60).optional(),
	text: z.string().min(1, "Message must not be empty").max(4000, "Message too long"),
	ctxTitle: z.string().max(200).nullish(),
	ctxTopicId: z.string().max(40).nullish(),
});

export const messageRoutes = new Hono<{ Bindings: Env }>().post(
	"/",
	zValidator("json", sendSchema),
	async (c) => {
		const body = c.req.valid("json");
		console.log("[API] POST /api/messages, chat:", body.chatId);
		try {
			await ensureSeeded(c.env);

			// Resolve the AI config: the signed-in user's provider settings,
			// or the backend default (OpenRouter + DeepSeek V4 Flash).
			const token = getSessionToken(c);
			const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
			const aiConfig = await resolveAiConfig(c.env, user?.id ?? null);
			// Per-request secrets for agent tools (user's own Tavily key, else
			// the built-in default), injected server-side — never model-visible.
			const webSearchKey = await resolveWebSearchKey(c.env, user?.id ?? null);
			const secrets: Record<string, string> = {};
			if (webSearchKey) secrets.tavily_api_key = webSearchKey;
			const agentCtx = { secrets };

			// Ask the configured model to write the reply text; on any failure
			// fall back to the rule-based copy so chat never breaks.
			let llm: { text: string; model: string } | null = null;
			let trace: AgentTrace | null = null;
			if (aiConfig.apiKey) {
				try {
					// Agent loop: the model can iteratively call tools (data-hub
					// sources, built-in skills, MCP servers) before answering. The
					// toolset is discovered at runtime — nothing here names a tool.
					const run = await runAgentLoop(
						c.env,
						aiConfig,
						[
							...(body.ctxTitle
								? [{ role: "system" as const, content: `用户当前正在阅读：「${body.ctxTitle}」` }]
								: []),
							{ role: "user", content: body.text },
						],
						agentCtx,
					);
					if (run.toolsUsed.length > 0) {
						console.log(
							"[API] POST /api/messages agent tools:",
							run.toolsUsed.map((t) => `${t.tool}${t.ok ? "" : "(failed)"}`).join(", "),
						);
					}
					llm = { text: run.text, model: aiConfig.model };
					trace = run.trace;
				} catch (error) {
					console.error(
						"[API] POST /api/messages LLM call failed (provider:",
						aiConfig.provider, "model:", aiConfig.model, "):",
						String(error),
					);
				}
			} else {
				console.warn(
					"[API] POST /api/messages: no API key for provider",
					aiConfig.provider, "— using rule-based reply",
				);
			}

			const reply = genReply(body.text, body.ctxTitle, llm);
			// A Today-page reading context pins the topic; otherwise the
			// reply's keyword-detected topic is the AI's auto-categorization.
			const topicId = body.ctxTopicId ?? reply.topicId;
			// The execution trace rides inside the persisted payload so the
			// debug modal can show how the answer was produced, even after reload.
			const aiMessage = { ...reply.msg, ...(trace ? { trace } : {}) };

			const userMessage = { id: body.userMessageId, role: "user" as const, text: body.text };

			await c.env.DB.batch([
				c.env.DB.prepare(
					"INSERT OR IGNORE INTO chats (id, topic_id, title, sub, grp) VALUES (?, ?, ?, ?, ?)",
				).bind(body.chatId, topicId, body.title ?? body.text.slice(0, 22), "新对话", "今天"),
				// AI keeps the chat's topic in sync with the conversation.
				c.env.DB.prepare("UPDATE chats SET topic_id = ? WHERE id = ?").bind(
					topicId,
					body.chatId,
				),
				c.env.DB.prepare(
					"INSERT OR IGNORE INTO messages (id, chat_id, role, payload) VALUES (?, ?, ?, ?)",
				).bind(userMessage.id, body.chatId, "user", JSON.stringify(userMessage)),
				c.env.DB.prepare(
					"INSERT INTO messages (id, chat_id, role, payload) VALUES (?, ?, ?, ?)",
				).bind(aiMessage.id, body.chatId, aiMessage.role, JSON.stringify(aiMessage)),
			]);

			return c.json({ chatId: body.chatId, topicId, aiMessage }, 201);
		} catch (error) {
			console.error("[API] POST /api/messages D1 error:", String(error));
			return c.json({ error: "Database error" }, 500);
		}
	},
);
