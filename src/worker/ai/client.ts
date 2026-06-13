/**
 * Minimal LLM chat client over plain fetch (no SDK dependencies).
 * Supports the two wire protocols in the provider catalog:
 *  - "openai":   POST {baseUrl}/chat/completions (OpenRouter, DeepSeek, OpenAI, custom)
 *  - "anthropic": POST {baseUrl}/messages
 *
 * Two entry points:
 *  - generateAgentTurn: one completion with native tool/function calling —
 *    returns the assistant's text and/or tool calls (the agent loop's engine).
 *  - generateChatText: tool-free convenience wrapper returning plain text.
 */

import { CONFIG } from "../config";
import type { AiRuntimeConfig } from "./settings";

export interface AiChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

/** A tool offered to the model (JSON Schema `parameters`). */
export interface AiToolDef {
	name: string;
	description: string;
	parameters: Record<string, unknown>;
}

/** One tool invocation the model requested. */
export interface AiToolCall {
	id: string;
	name: string;
	arguments: Record<string, unknown>;
}

/** Conversation message in an agent run (superset of AiChatMessage). */
export type AgentChatMessage =
	| { role: "system" | "user"; content: string }
	| { role: "assistant"; content: string | null; toolCalls?: AiToolCall[] }
	| { role: "tool"; toolCallId: string; name: string; content: string };

/** What one completion produced: final text, tool calls, or both. */
export interface AgentTurn {
	text: string | null;
	toolCalls: AiToolCall[];
}

interface OpenAiToolCallWire {
	id?: string;
	function?: { name?: string; arguments?: string };
}

interface OpenAiResponse {
	choices?: {
		message?: { content?: string | null; tool_calls?: OpenAiToolCallWire[] };
	}[];
}

interface AnthropicBlock {
	type: string;
	text?: string;
	id?: string;
	name?: string;
	input?: Record<string, unknown>;
}

interface AnthropicResponse {
	content?: AnthropicBlock[];
}

function joinUrl(baseUrl: string, path: string): string {
	return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

/** Map neutral agent messages to the OpenAI chat-completions wire format. */
function toOpenAiMessages(messages: AgentChatMessage[]): unknown[] {
	return messages.map((m) => {
		if (m.role === "tool") {
			return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
		}
		if (m.role === "assistant") {
			return {
				role: "assistant",
				content: m.content,
				...(m.toolCalls?.length
					? {
							tool_calls: m.toolCalls.map((tc) => ({
								id: tc.id,
								type: "function",
								function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
							})),
						}
					: {}),
			};
		}
		return { role: m.role, content: m.content };
	});
}

/** Map neutral agent messages to the Anthropic content-block wire format. */
function toAnthropicMessages(messages: AgentChatMessage[]): unknown[] {
	const out: { role: "user" | "assistant"; content: unknown[] }[] = [];
	for (const m of messages) {
		if (m.role === "system") continue; // hoisted to the top-level `system` field
		if (m.role === "user") {
			out.push({ role: "user", content: [{ type: "text", text: m.content }] });
		} else if (m.role === "assistant") {
			const blocks: unknown[] = [];
			if (m.content) blocks.push({ type: "text", text: m.content });
			for (const tc of m.toolCalls ?? []) {
				blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.arguments });
			}
			out.push({ role: "assistant", content: blocks });
		} else if (m.role === "tool") {
			// Tool results ride in user messages; merge consecutive ones so each
			// assistant tool_use turn gets a single matching user turn.
			const block = { type: "tool_result", tool_use_id: m.toolCallId, content: m.content };
			const last = out[out.length - 1];
			const lastIsResults =
				last?.role === "user" &&
				(last.content[0] as { type?: string } | undefined)?.type === "tool_result";
			if (lastIsResults) last.content.push(block);
			else out.push({ role: "user", content: [block] });
		}
	}
	return out;
}

function parseOpenAiTurn(data: OpenAiResponse): AgentTurn {
	const msg = data.choices?.[0]?.message;
	const toolCalls: AiToolCall[] = (msg?.tool_calls ?? []).flatMap((tc, i) => {
		if (!tc.function?.name) return [];
		let args: Record<string, unknown> = {};
		try {
			args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
		} catch {
			console.warn("[AI] unparseable tool arguments:", tc.function.arguments);
		}
		return [{ id: tc.id ?? `call_${i}`, name: tc.function.name, arguments: args }];
	});
	return { text: msg?.content?.trim() || null, toolCalls };
}

function parseAnthropicTurn(data: AnthropicResponse): AgentTurn {
	const blocks = data.content ?? [];
	const text =
		blocks
			.filter((b) => b.type === "text" && b.text)
			.map((b) => b.text)
			.join("\n")
			.trim() || null;
	const toolCalls: AiToolCall[] = blocks
		.filter((b) => b.type === "tool_use" && b.name)
		.map((b, i) => ({
			id: b.id ?? `call_${i}`,
			name: b.name as string,
			arguments: b.input ?? {},
		}));
	return { text, toolCalls };
}

/**
 * Run one completion against the configured model, optionally offering
 * tools. Returns the assistant's text and any tool calls it requested.
 */
export async function generateAgentTurn(
	cfg: AiRuntimeConfig,
	messages: AgentChatMessage[],
	tools: AiToolDef[],
	opts?: { maxTokens?: number; timeoutMs?: number },
): Promise<AgentTurn> {
	if (!cfg.apiKey) throw new Error("No API key available for AI provider");
	if (!cfg.baseUrl) throw new Error("No base URL configured for AI provider");

	const maxTokens = opts?.maxTokens ?? CONFIG.AI.MAX_COMPLETION_TOKENS;
	const signal = AbortSignal.timeout(opts?.timeoutMs ?? CONFIG.AI.REQUEST_TIMEOUT_MS);

	let url: string;
	let headers: Record<string, string>;
	let payload: unknown;

	if (cfg.protocol === "anthropic") {
		url = joinUrl(cfg.baseUrl, "/messages");
		headers = {
			"Content-Type": "application/json",
			"x-api-key": cfg.apiKey,
			"anthropic-version": "2023-06-01",
		};
		const system = messages
			.filter((m) => m.role === "system")
			.map((m) => (m as { content: string }).content)
			.join("\n");
		payload = {
			model: cfg.model,
			max_tokens: maxTokens,
			...(system ? { system } : {}),
			...(tools.length
				? {
						tools: tools.map((t) => ({
							name: t.name,
							description: t.description,
							input_schema: t.parameters,
						})),
					}
				: {}),
			messages: toAnthropicMessages(messages),
		};
	} else {
		url = joinUrl(cfg.baseUrl, "/chat/completions");
		headers = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${cfg.apiKey}`,
			// OpenRouter app-attribution headers (ignored by other providers).
			"X-Title": "NanoBee",
		};
		payload = {
			model: cfg.model,
			max_tokens: maxTokens,
			...(tools.length
				? {
						tools: tools.map((t) => ({
							type: "function",
							function: {
								name: t.name,
								description: t.description,
								parameters: t.parameters,
							},
						})),
					}
				: {}),
			messages: toOpenAiMessages(messages),
		};
	}

	const res = await fetch(url, {
		method: "POST",
		headers,
		body: JSON.stringify(payload),
		signal,
	});

	if (!res.ok) {
		const body = (await res.text()).slice(0, 500);
		throw new Error(`AI provider ${cfg.provider} returned ${res.status}: ${body}`);
	}

	const turn =
		cfg.protocol === "anthropic"
			? parseAnthropicTurn((await res.json()) as AnthropicResponse)
			: parseOpenAiTurn((await res.json()) as OpenAiResponse);

	if (!turn.text && turn.toolCalls.length === 0) {
		throw new Error(`AI provider ${cfg.provider} returned an empty reply`);
	}
	return turn;
}

/**
 * Send the smallest possible request to verify connectivity + credentials,
 * used by the connection-test endpoint for providers that have no usable
 * model-list endpoint. Caps the reply at 1 token so it stays cheap; any 2xx
 * means the key/host/model tuple works. Throws with a diagnosable message.
 */
export async function pingChatModel(cfg: AiRuntimeConfig): Promise<void> {
	if (!cfg.apiKey) throw new Error("No API key available for AI provider");
	if (!cfg.baseUrl) throw new Error("No base URL configured for AI provider");
	if (!cfg.model) throw new Error("No model configured for AI provider");

	const signal = AbortSignal.timeout(CONFIG.AI.REQUEST_TIMEOUT_MS);
	let url: string;
	let headers: Record<string, string>;

	if (cfg.protocol === "anthropic") {
		url = joinUrl(cfg.baseUrl, "/messages");
		headers = {
			"Content-Type": "application/json",
			"x-api-key": cfg.apiKey,
			"anthropic-version": "2023-06-01",
		};
	} else {
		url = joinUrl(cfg.baseUrl, "/chat/completions");
		headers = {
			"Content-Type": "application/json",
			Authorization: `Bearer ${cfg.apiKey}`,
			"X-Title": "NanoBee",
		};
	}
	const payload = { model: cfg.model, max_tokens: 1, messages: [{ role: "user", content: "hi" }] };

	const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload), signal });
	if (!res.ok) {
		const body = (await res.text()).slice(0, 300);
		throw new Error(`provider returned ${res.status}: ${body}`);
	}
}

/** Call the configured chat model (no tools) and return the reply text. */
export async function generateChatText(
	cfg: AiRuntimeConfig,
	messages: AiChatMessage[],
	opts?: { maxTokens?: number; timeoutMs?: number },
): Promise<string> {
	const turn = await generateAgentTurn(cfg, messages, [], opts);
	const trimmed = turn.text?.trim();
	if (!trimmed) throw new Error(`AI provider ${cfg.provider} returned an empty reply`);
	return trimmed;
}
