/**
 * POST /api/messages — the chat send pipeline.
 * Persists the user's message, creates the chat row when it is new,
 * generates the AI reply server-side, persists it and returns it.
 * The client renders its own message optimistically and supplies the ids,
 * so what it shows is exactly what lands in D1.
 *
 * Two siblings share the same resolve/persist helpers:
 *  - POST "/"       — one-shot JSON reply (quick chat / non-streaming fallback).
 *  - POST "/stream" — SSE: `token` events stream the answer as it is written,
 *    then a `final` event carries the authoritative persisted message.
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../api-worker";
import type { AgentTrace } from "../../lib/agent-trace";
import { resolveAiConfig, resolveWebSearchKey } from "../ai/settings";
import { webSearchSecretParam } from "../../lib/ai-providers";
import { runAgentLoop, type AgentRunResult } from "../agent/loop";
import type { AgentChatMessage } from "../ai/client";
import { getSessionToken } from "../auth/cookies";
import { getUserBySessionToken } from "../auth/store";
import { genReply } from "../reply";
import { ANON_OWNER } from "../artifacts/repo";
import type { ArtifactRef } from "../../artifacts/types";

const ID_PATTERN = /^[a-z]+_[A-Za-z0-9_-]{4,40}$/;

const sendSchema = z.object({
	chatId: z.string().regex(ID_PATTERN, "Invalid chat id"),
	userMessageId: z.string().regex(ID_PATTERN, "Invalid message id"),
	title: z.string().min(1).max(60).optional(),
	text: z.string().min(1, "Message must not be empty").max(4000, "Message too long"),
	ctxTitle: z.string().max(200).nullish(),
	ctxTopicId: z.string().max(40).nullish(),
});

type SendBody = z.infer<typeof sendSchema>;

/** Per-request agent inputs resolved once, shared by both routes. */
interface PreparedRun {
	aiConfig: Awaited<ReturnType<typeof resolveAiConfig>>;
	agentCtx: {
		secrets: Record<string, string>;
		artifacts: { owner: string; chatId: string; created: ArtifactRef[] };
	};
	/** Same array reference the agent fills in; read after the run completes. */
	createdArtifacts: ArtifactRef[];
}

/** The conversation the model sees: optional reading-context + the user turn. */
function buildAgentMessages(body: SendBody): AgentChatMessage[] {
	return [
		...(body.ctxTitle
			? [{ role: "system" as const, content: `用户当前正在阅读：「${body.ctxTitle}」` }]
			: []),
		{ role: "user" as const, content: body.text },
	];
}

/**
 * Resolve the AI config, per-request web-search secrets (injected under
 * `<provider>_api_key`, never model-visible) and the artifact context that
 * lets the agent create card-deck artifacts from this chat.
 */
async function prepareRun(c: Context<{ Bindings: Env }>, body: SendBody): Promise<PreparedRun> {
	const token = getSessionToken(c);
	const user = token ? await getUserBySessionToken(c.env.DB, token) : null;
	const aiConfig = await resolveAiConfig(c.env, user?.id ?? null);

	const webSearch = await resolveWebSearchKey(c.env, user?.id ?? null);
	const secrets: Record<string, string> = {};
	if (webSearch) secrets[webSearchSecretParam(webSearch.provider)] = webSearch.key;

	const createdArtifacts: ArtifactRef[] = [];
	const agentCtx = {
		secrets,
		artifacts: { owner: user?.id ?? ANON_OWNER, chatId: body.chatId, created: createdArtifacts },
	};
	return { aiConfig, agentCtx, createdArtifacts };
}

/** Log which tools an agent run used (observability only). */
function logTools(run: AgentRunResult): void {
	if (run.toolsUsed.length > 0) {
		console.log(
			"[API] POST /api/messages agent tools:",
			run.toolsUsed.map((t) => `${t.tool}${t.ok ? "" : "(failed)"}`).join(", "),
		);
	}
}

/**
 * Assemble the AI message (LLM text when available, else the rule-based
 * fallback so chat never breaks), persist the user + AI rows and upsert the
 * chat, then return the payload shared by both routes.
 */
async function persistTurn(
	c: Context<{ Bindings: Env }>,
	body: SendBody,
	llm: { text: string; model: string } | null,
	trace: AgentTrace | null,
	createdArtifacts: ArtifactRef[],
): Promise<{ chatId: string; topicId: string; aiMessage: ReturnType<typeof genReply>["msg"] }> {
	const reply = genReply(body.text, body.ctxTitle, llm);
	// A Today-page reading context pins the topic; otherwise the reply's
	// keyword-detected topic is the AI's auto-categorization.
	const topicId = body.ctxTopicId ?? reply.topicId;
	// The execution trace + any artifacts ride inside the persisted payload so
	// the debug modal and artifact card survive reload.
	const aiMessage = {
		...reply.msg,
		...(trace ? { trace } : {}),
		...(createdArtifacts.length ? { artifacts: createdArtifacts } : {}),
	};
	const userMessage = { id: body.userMessageId, role: "user" as const, text: body.text };

	await c.env.DB.batch([
		c.env.DB.prepare(
			"INSERT OR IGNORE INTO chats (id, topic_id, title, sub, grp) VALUES (?, ?, ?, ?, ?)",
		).bind(body.chatId, topicId, body.title ?? body.text.slice(0, 22), "新对话", "今天"),
		// AI keeps the chat's topic in sync with the conversation.
		c.env.DB.prepare("UPDATE chats SET topic_id = ? WHERE id = ?").bind(topicId, body.chatId),
		c.env.DB.prepare(
			"INSERT OR IGNORE INTO messages (id, chat_id, role, payload) VALUES (?, ?, ?, ?)",
		).bind(userMessage.id, body.chatId, "user", JSON.stringify(userMessage)),
		c.env.DB.prepare(
			"INSERT INTO messages (id, chat_id, role, payload) VALUES (?, ?, ?, ?)",
		).bind(aiMessage.id, body.chatId, aiMessage.role, JSON.stringify(aiMessage)),
	]);

	return { chatId: body.chatId, topicId, aiMessage };
}

export const messageRoutes = new Hono<{ Bindings: Env }>()
	.post("/", zValidator("json", sendSchema), async (c) => {
		const body = c.req.valid("json");
		console.log("[API] POST /api/messages, chat:", body.chatId);
		try {
			const { aiConfig, agentCtx, createdArtifacts } = await prepareRun(c, body);

			// Ask the configured model to write the reply; on any failure fall
			// back to the rule-based copy so chat never breaks.
			let llm: { text: string; model: string } | null = null;
			let trace: AgentTrace | null = null;
			if (aiConfig.apiKey) {
				try {
					const run = await runAgentLoop(c.env, aiConfig, buildAgentMessages(body), agentCtx);
					logTools(run);
					llm = { text: run.text, model: aiConfig.model };
					trace = run.trace;
				} catch (error) {
					console.error(
						"[API] POST /api/messages LLM call failed (provider:",
						aiConfig.provider, "model:", aiConfig.model, "):", String(error),
					);
				}
			} else {
				console.warn(
					"[API] POST /api/messages: no API key for provider",
					aiConfig.provider, "— using rule-based reply",
				);
			}

			const payload = await persistTurn(c, body, llm, trace, createdArtifacts);
			return c.json(payload, 201);
		} catch (error) {
			console.error("[API] POST /api/messages D1 error:", String(error));
			return c.json({ error: "Database error" }, 500);
		}
	})
	// Streaming sibling: emits `token` events as the answer is written, then a
	// `final` event with the persisted payload (same shape POST "/" returns).
	// Tokens are JSON-encoded so newlines never break SSE framing. Chat never
	// breaks: an LLM/agent failure falls back to the rule-based reply, still
	// delivered via `final`. Config/secret resolution runs BEFORE the stream
	// opens so a setup failure can still surface as a clean HTTP error.
	.post("/stream", zValidator("json", sendSchema), async (c) => {
		const body = c.req.valid("json");
		console.log("[API] POST /api/messages/stream, chat:", body.chatId);
		const { aiConfig, agentCtx, createdArtifacts } = await prepareRun(c, body);

		return streamSSE(c, async (stream) => {
			// Accumulate everything streamed so the persisted message is exactly
			// what the user watched type out (no swap-in jump on `final`).
			let acc = "";
			let trace: AgentTrace | null = null;
			if (aiConfig.apiKey) {
				try {
					const run = await runAgentLoop(
						c.env, aiConfig, buildAgentMessages(body), agentCtx,
						async (delta) => {
							acc += delta;
							await stream.writeSSE({ event: "token", data: JSON.stringify(delta) });
						},
					);
					logTools(run);
					trace = run.trace;
				} catch (error) {
					console.error(
						"[API] POST /api/messages/stream LLM call failed (provider:",
						aiConfig.provider, "model:", aiConfig.model, "):", String(error),
					);
				}
			} else {
				console.warn(
					"[API] POST /api/messages/stream: no API key for provider",
					aiConfig.provider, "— using rule-based reply",
				);
			}

			const llm = acc.trim() ? { text: acc, model: aiConfig.model } : null;
			try {
				const payload = await persistTurn(c, body, llm, trace, createdArtifacts);
				await stream.writeSSE({ event: "final", data: JSON.stringify(payload) });
			} catch (error) {
				console.error("[API] POST /api/messages/stream persist error:", String(error));
				await stream.writeSSE({ event: "error", data: JSON.stringify("Database error") });
			}
		});
	});
