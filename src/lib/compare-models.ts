/**
 * Shared catalog for the multi-model compare page (used by frontend + worker).
 * Pure data, no platform deps — so the column picker, the default compare set
 * and the provider brand dots all agree on one source of truth.
 *
 * Model ids are a curated convenience list so the picker works with zero network
 * calls. Users can still type any model id. For OpenRouter (an aggregator) the
 * model id carries the upstream vendor prefix, e.g. "anthropic/claude-haiku-4.5".
 */

import type { AiProviderId } from "./ai-providers";

/** At least 2 columns, at most 6 (readability cap on a normal screen width). */
export const MIN_COMPARE_COLUMNS = 2;
export const MAX_COMPARE_COLUMNS = 6;

/** Brand dot color per provider, shown next to the model name in the picker. */
export const PROVIDER_DOT: Record<AiProviderId, string> = {
	openrouter: "#6566f1",
	openai: "#10a37f",
	anthropic: "#d97757",
	google: "#4285f4",
	deepseek: "#4d6bfe",
	xai: "#1f2937",
	groq: "#f55036",
	mistral: "#ff7000",
	moonshot: "#1f2430",
	zhipu: "#3859ff",
	dashscope: "#615ced",
	siliconflow: "#7c3aed",
	custom: "#5a5e6b",
};

/** One pickable model in a compare column's dropdown. */
export interface CompareModelOption {
	provider: AiProviderId;
	model: string;
	label: string;
}

/**
 * Curated common models per provider. OpenRouter entries come first because that
 * provider ships with NanoBee's built-in key (zero-config), so they always work.
 */
export const COMMON_MODELS: CompareModelOption[] = [
	// OpenRouter (aggregator, built-in key — always usable without setup)
	{ provider: "openrouter", model: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash" },
	{ provider: "openrouter", model: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5" },
	{ provider: "openrouter", model: "openai/gpt-5-mini", label: "GPT-5 mini" },
	{ provider: "openrouter", model: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
	{ provider: "openrouter", model: "x-ai/grok-4-fast", label: "Grok 4 Fast" },
	{ provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
	// OpenAI (own key)
	{ provider: "openai", model: "gpt-5-mini", label: "GPT-5 mini" },
	{ provider: "openai", model: "gpt-5", label: "GPT-5" },
	// Anthropic (own key)
	{ provider: "anthropic", model: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
	{ provider: "anthropic", model: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
	// Google Gemini (own key)
	{ provider: "google", model: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
	{ provider: "google", model: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
	// DeepSeek (own key)
	{ provider: "deepseek", model: "deepseek-chat", label: "DeepSeek Chat" },
	{ provider: "deepseek", model: "deepseek-reasoner", label: "DeepSeek Reasoner" },
	// xAI Grok (own key)
	{ provider: "xai", model: "grok-4-fast", label: "Grok 4 Fast" },
	// Groq (own key)
	{ provider: "groq", model: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
	// Mistral (own key)
	{ provider: "mistral", model: "mistral-large-latest", label: "Mistral Large" },
	// Moonshot Kimi (own key)
	{ provider: "moonshot", model: "moonshot-v1-8k", label: "Kimi v1 8K" },
];

/** Default 2-column compare set: two OpenRouter models, so it runs with no setup. */
export const DEFAULT_COMPARE_MODELS: CompareModelOption[] = [COMMON_MODELS[0], COMMON_MODELS[1]];

/** Stable string key for a (provider, model) pair — used in URL state + react keys. */
export function modelKey(provider: AiProviderId, model: string): string {
	return `${provider}:${model}`;
}

/** Parse a `provider:model` URL token back into a {provider, model}, or null. */
export function parseModelKey(
	token: string,
	isProvider: (id: string) => boolean,
): { provider: AiProviderId; model: string } | null {
	const i = token.indexOf(":");
	if (i <= 0) return null;
	const provider = token.slice(0, i);
	const model = token.slice(i + 1);
	if (!model || !isProvider(provider)) return null;
	return { provider: provider as AiProviderId, model };
}

/** Display label for a (provider, model): the curated label, else the raw id. */
export function modelLabel(provider: AiProviderId, model: string): string {
	return COMMON_MODELS.find((m) => m.provider === provider && m.model === model)?.label ?? model;
}
