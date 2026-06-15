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
import { nanoid } from "nanoid";
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
import { compileTaskIntent } from "../agent/task-compiler";
import type { InlineSuggestion } from "../../types";

const ID_PATTERN = /^[a-z]+_[A-Za-z0-9_-]{4,40}$/;

const sendSchema = z.object({
	chatId: z.string().regex(ID_PATTERN, "Invalid chat id"),
	userMessageId: z.string().regex(ID_PATTERN, "Invalid message id"),
	title: z.string().min(1).max(60).optional(),
	text: z.string().min(1, "Message must not be empty").max(4000, "Message too long"),
	ctxTitle: z.string().max(200).nullish(),
	ctxTopicId: z.string().max(40).nullish(),
	ctxPage: z.string().max(120).nullish(),
});

type SendBody = z.infer<typeof sendSchema>;

/** Per-request agent inputs resolved once, shared by both routes. */
interface PreparedRun {
	aiConfig: Awaited<ReturnType<typeof resolveAiConfig>>;
	agentCtx: {
		secrets: Record<string, string>;
		artifacts: { owner: string; chatId: string; created: ArtifactRef[] };
		executionCtx?: { waitUntil(promise: Promise<unknown>): void };
	};
	/** Same array reference the agent fills in; read after the run completes. */
	createdArtifacts: ArtifactRef[];
}

/** The conversation the model sees: optional viewing-context + the user turn.
 *  The context names the page the user is on (`ctxPage`) and, when reported, the
 *  specific item in view (`ctxTitle`) — so the reply can be grounded in whatever
 *  surface (today / tasks / research / …) the user is looking at, not only an
 *  article. */
function buildAgentMessages(body: SendBody): AgentChatMessage[] {
	const parts: string[] = [];
	if (body.ctxPage) parts.push(`当前所在页面：${body.ctxPage}`);
	if (body.ctxTitle) parts.push(`正在查看：「${body.ctxTitle}」`);
	return [
		...(parts.length
			? [{ role: "system" as const, content: `用户正在使用 NanoBee。${parts.join("；")}。如与问题相关，请结合该页面上下文作答。` }]
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
		// Lets the create_data_view tool fetch in the background (chat replies
		// immediately; the data view loads after the response is sent).
		executionCtx: c.executionCtx,
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
 *
 * The `owner` parameter scopes all inserts to the correct user bucket so
 * chats and messages are never visible across account boundaries.
 *
 * When `taskSuggestion` is provided it is embedded in the AI message payload
 * so the client can render a confirmation card and create the task on accept.
 */
async function persistTurn(
	c: Context<{ Bindings: Env }>,
	body: SendBody,
	llm: { text: string; model: string } | null,
	trace: AgentTrace | null,
	createdArtifacts: ArtifactRef[],
	owner: string,
	taskSuggestion?: InlineSuggestion,
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
		...(taskSuggestion ? { taskSuggestion } : {}),
	};
	const userMessage = { id: body.userMessageId, role: "user" as const, text: body.text };

	await c.env.DB.batch([
		c.env.DB.prepare(
			"INSERT OR IGNORE INTO chats (id, owner, topic_id, title, sub, grp) VALUES (?, ?, ?, ?, ?, ?)",
		).bind(body.chatId, owner, topicId, body.title ?? body.text.slice(0, 22), "新对话", "今天"),
		// AI keeps the chat's topic in sync with the conversation; guard by owner so
		// a crafted chatId cannot update another user's chat.
		c.env.DB.prepare("UPDATE chats SET topic_id = ? WHERE id = ? AND owner = ?").bind(topicId, body.chatId, owner),
		c.env.DB.prepare(
			"INSERT OR IGNORE INTO messages (id, owner, chat_id, role, payload) VALUES (?, ?, ?, ?, ?)",
		).bind(userMessage.id, owner, body.chatId, "user", JSON.stringify(userMessage)),
		// OR IGNORE: the AI message id is deterministic per turn; a client retry
		// (e.g. streaming reconnect) must not duplicate the row.
		c.env.DB.prepare(
			"INSERT OR IGNORE INTO messages (id, owner, chat_id, role, payload) VALUES (?, ?, ?, ?, ?)",
		).bind(aiMessage.id, owner, body.chatId, aiMessage.role, JSON.stringify(aiMessage)),
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

			// Run the NL→TriggerSpec compiler concurrently with the reply pipeline.
			// A failure is non-fatal — chat continues without a task card.
			const taskData = await compileTaskIntent(aiConfig, body.text).catch((err) => {
				console.warn("[API] task-compiler failed:", String(err));
				return null;
			});
			const taskSuggestion: InlineSuggestion | undefined = taskData
				? {
						taskId: `task_${nanoid(10)}`,
						title: taskData.title,
						topic: taskData.topic,
						triggerLabel: taskData.triggerLabel,
						message: taskData.message,
						triggerSpec: taskData.triggerSpec!,
					}
				: undefined;

			const payload = await persistTurn(c, body, llm, trace, createdArtifacts, agentCtx.artifacts.owner, taskSuggestion);
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
						// When the client presses stop it aborts the fetch, which fires
						// this request's signal — the agent loop stops generating too.
						c.req.raw.signal,
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
			// Run the NL→TriggerSpec compiler after the main reply is done.
			// Non-fatal: chat continues without a task card on any failure.
			const taskData = await compileTaskIntent(aiConfig, body.text).catch((err) => {
				console.warn("[API] task-compiler (stream) failed:", String(err));
				return null;
			});
			const taskSuggestion: InlineSuggestion | undefined = taskData
				? {
						taskId: `task_${nanoid(10)}`,
						title: taskData.title,
						topic: taskData.topic,
						triggerLabel: taskData.triggerLabel,
						message: taskData.message,
						triggerSpec: taskData.triggerSpec!,
					}
				: undefined;
			try {
				const payload = await persistTurn(c, body, llm, trace, createdArtifacts, agentCtx.artifacts.owner, taskSuggestion);
				await stream.writeSSE({ event: "final", data: JSON.stringify(payload) });
			} catch (error) {
				console.error("[API] POST /api/messages/stream persist error:", String(error));
				await stream.writeSSE({ event: "error", data: JSON.stringify("Database error") });
			}
		});
	});
