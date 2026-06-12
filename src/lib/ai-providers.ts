/**
 * AI provider catalog shared by the worker and the frontend.
 * Pure data with no platform dependencies, so both sides agree on the same
 * provider list and defaults. NanoBee's backend default is OpenRouter
 * running DeepSeek V4 Flash (`deepseek/deepseek-v4-flash`).
 */

export type AiProviderId =
	| "openrouter"
	| "openai"
	| "anthropic"
	| "google"
	| "deepseek"
	| "xai"
	| "groq"
	| "mistral"
	| "moonshot"
	| "zhipu"
	| "dashscope"
	| "siliconflow"
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
	/**
	 * Whether this provider exposes a model-list endpoint we can auto-fetch.
	 * `false` for providers without a usable GET /models (manual entry only).
	 */
	canListModels: boolean;
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
		canListModels: true,
		hint: "默认推荐。不填 API Key 时使用 NanoBee 内置额度（DeepSeek V4 Flash）。",
	},
	{
		id: "openai",
		label: "OpenAI",
		defaultBaseUrl: "https://api.openai.com/v1",
		defaultModel: "gpt-5-mini",
		protocol: "openai",
		keyOptional: false,
		canListModels: true,
		hint: "使用 OpenAI 官方 API，需要你自己的 API Key。",
	},
	{
		id: "anthropic",
		label: "Anthropic",
		defaultBaseUrl: "https://api.anthropic.com/v1",
		defaultModel: "claude-haiku-4-5",
		protocol: "anthropic",
		keyOptional: false,
		canListModels: true,
		hint: "使用 Anthropic Claude API，需要你自己的 API Key。",
	},
	{
		id: "google",
		label: "Google Gemini",
		defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
		defaultModel: "gemini-2.5-flash",
		protocol: "openai",
		keyOptional: false,
		canListModels: true,
		hint: "Google Gemini（OpenAI 兼容端点），需要 Google AI Studio 的 API Key。",
	},
	{
		id: "deepseek",
		label: "DeepSeek",
		defaultBaseUrl: "https://api.deepseek.com/v1",
		defaultModel: "deepseek-chat",
		protocol: "openai",
		keyOptional: false,
		canListModels: true,
		hint: "直连 DeepSeek 官方 API，需要你自己的 API Key。",
	},
	{
		id: "xai",
		label: "xAI Grok",
		defaultBaseUrl: "https://api.x.ai/v1",
		defaultModel: "grok-4-fast",
		protocol: "openai",
		keyOptional: false,
		canListModels: true,
		hint: "xAI Grok 系列，需要 xAI 控制台的 API Key。",
	},
	{
		id: "groq",
		label: "Groq",
		defaultBaseUrl: "https://api.groq.com/openai/v1",
		defaultModel: "llama-3.3-70b-versatile",
		protocol: "openai",
		keyOptional: false,
		canListModels: true,
		hint: "Groq 超低延迟推理，需要 Groq Cloud 的 API Key。",
	},
	{
		id: "mistral",
		label: "Mistral",
		defaultBaseUrl: "https://api.mistral.ai/v1",
		defaultModel: "mistral-large-latest",
		protocol: "openai",
		keyOptional: false,
		canListModels: true,
		hint: "Mistral AI 官方 API，需要你自己的 API Key。",
	},
	{
		id: "moonshot",
		label: "Moonshot Kimi",
		defaultBaseUrl: "https://api.moonshot.cn/v1",
		defaultModel: "moonshot-v1-8k",
		protocol: "openai",
		keyOptional: false,
		canListModels: true,
		hint: "月之暗面 Kimi，需要 Moonshot 开放平台的 API Key。",
	},
	{
		id: "zhipu",
		label: "智谱 GLM",
		defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
		defaultModel: "glm-4-flash",
		protocol: "openai",
		keyOptional: false,
		canListModels: false,
		hint: "智谱 AI GLM 系列，需要 bigmodel.cn 的 API Key。",
	},
	{
		id: "dashscope",
		label: "通义千问 Qwen",
		defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
		defaultModel: "qwen-plus",
		protocol: "openai",
		keyOptional: false,
		canListModels: false,
		hint: "阿里云百炼 / 通义千问（OpenAI 兼容端点），需要 DashScope 的 API Key。",
	},
	{
		id: "siliconflow",
		label: "SiliconFlow",
		defaultBaseUrl: "https://api.siliconflow.cn/v1",
		defaultModel: "deepseek-ai/DeepSeek-V3",
		protocol: "openai",
		keyOptional: false,
		canListModels: true,
		hint: "硅基流动多模型聚合，需要 SiliconFlow 的 API Key。",
	},
	{
		id: "custom",
		label: "自定义",
		defaultBaseUrl: "",
		defaultModel: "",
		protocol: "openai",
		keyOptional: false,
		canListModels: true,
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
