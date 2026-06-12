/**
 * Minimal LLM chat client over plain fetch (no SDK dependencies).
 * Supports the two wire protocols in the provider catalog:
 *  - "openai":   POST {baseUrl}/chat/completions (OpenRouter, DeepSeek, OpenAI, custom)
 *  - "anthropic": POST {baseUrl}/messages
 * Returns the assistant's text or throws with a diagnosable message.
 */

import { CONFIG } from "../config";
import type { AiRuntimeConfig } from "./settings";

export interface AiChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

interface OpenAiResponse {
	choices?: { message?: { content?: string } }[];
}

interface AnthropicResponse {
	content?: { type: string; text?: string }[];
}

function joinUrl(baseUrl: string, path: string): string {
	return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

/** Call the configured chat model and return the reply text. */
export async function generateChatText(
	cfg: AiRuntimeConfig,
	messages: AiChatMessage[],
): Promise<string> {
	if (!cfg.apiKey) throw new Error("No API key available for AI provider");
	if (!cfg.baseUrl) throw new Error("No base URL configured for AI provider");

	const signal = AbortSignal.timeout(CONFIG.AI.REQUEST_TIMEOUT_MS);

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
			.map((m) => m.content)
			.join("\n");
		payload = {
			model: cfg.model,
			max_tokens: CONFIG.AI.MAX_COMPLETION_TOKENS,
			...(system ? { system } : {}),
			messages: messages.filter((m) => m.role !== "system"),
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
			max_tokens: CONFIG.AI.MAX_COMPLETION_TOKENS,
			messages,
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

	let text: string | undefined;
	if (cfg.protocol === "anthropic") {
		const data = (await res.json()) as AnthropicResponse;
		text = data.content?.find((b) => b.type === "text")?.text;
	} else {
		const data = (await res.json()) as OpenAiResponse;
		text = data.choices?.[0]?.message?.content ?? undefined;
	}

	const trimmed = text?.trim();
	if (!trimmed) throw new Error(`AI provider ${cfg.provider} returned an empty reply`);
	return trimmed;
}
