/**
 * AI provider catalog shared by the worker and the frontend.
 * Pure data with no platform dependencies, so both sides agree on the same
 * provider list and defaults. NanoBee's backend default is OpenRouter
 * running DeepSeek V4 Flash (`deepseek/deepseek-v4-flash`).
 */

export type AiProviderId =
	| "openrouter"
	| "deepseek"
	| "openai"
	| "anthropic"
	| "custom";

/** Wire protocol used to call the provider. */
export type AiProtocol = "openai" | "anthropic";

export interface AiProviderInfo {
	id: AiProviderId;
	label: string;
	/** Default API base URL; empty for "custom" (the user must fill it in). */
	defaultBaseUrl: string;
	/** Default model id on this provider (always user-editable). */
	defaultModel: string;
	/** "openai" = OpenAI-compatible /chat/completions, "anthropic" = /messages. */
	protocol: AiProtocol;
	/** True when a blank API key is allowed (falls back to NanoBee's built-in key). */
	keyOptional: boolean;
	/** One-line helper shown under the provider picker (UI copy, zh-CN). */
	hint: string;
}

export const AI_PROVIDERS: AiProviderInfo[] = [
	{
		id: "openrouter",
		label: "OpenRouter",
		defaultBaseUrl: "https://openrouter.ai/api/v1",
		defaultModel: "deepseek/deepseek-v4-flash",
		protocol: "openai",
		keyOptional: true,
		hint: "默认推荐。不填 API Key 时使用 NanoBee 内置额度（DeepSeek V4 Flash）。",
	},
	{
		id: "deepseek",
		label: "DeepSeek",
		defaultBaseUrl: "https://api.deepseek.com/v1",
		defaultModel: "deepseek-chat",
		protocol: "openai",
		keyOptional: false,
		hint: "直连 DeepSeek 官方 API，需要你自己的 API Key。",
	},
	{
		id: "openai",
		label: "OpenAI",
		defaultBaseUrl: "https://api.openai.com/v1",
		defaultModel: "gpt-5-mini",
		protocol: "openai",
		keyOptional: false,
		hint: "使用 OpenAI 官方 API，需要你自己的 API Key。",
	},
	{
		id: "anthropic",
		label: "Anthropic",
		defaultBaseUrl: "https://api.anthropic.com/v1",
		defaultModel: "claude-haiku-4-5",
		protocol: "anthropic",
		keyOptional: false,
		hint: "使用 Anthropic Claude API，需要你自己的 API Key。",
	},
	{
		id: "custom",
		label: "自定义",
		defaultBaseUrl: "",
		defaultModel: "",
		protocol: "openai",
		keyOptional: false,
		hint: "任何 OpenAI 兼容接口（如 Ollama、vLLM、第三方网关），需填写 Host 与 API Key。",
	},
];

/** Backend default: OpenRouter + DeepSeek V4 Flash via NanoBee's built-in key. */
export const DEFAULT_AI_PROVIDER: AiProviderId = "openrouter";

export const AI_PROVIDER_IDS = AI_PROVIDERS.map((p) => p.id) as [
	AiProviderId,
	...AiProviderId[],
];

export function getProviderInfo(id: string): AiProviderInfo {
	return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0];
}
