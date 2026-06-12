/**
 * Fetch the available model list from a provider, server-side.
 * Runs on the worker (never the browser) so the API key stays secret and we
 * sidestep provider CORS. Mirrors the two wire protocols of `client.ts`:
 *  - "openai":    GET {baseUrl}/models  →  { data: [{ id }] }
 *  - "anthropic": GET {baseUrl}/models  →  { data: [{ id }] }  (x-api-key headers)
 * Returns model ids sorted alphabetically; throws with a diagnosable message.
 */

import type { AiProtocol } from "../../lib/ai-providers";
import { CONFIG } from "../config";

interface ModelListResponse {
	data?: { id?: string }[];
}

export interface ListModelsInput {
	protocol: AiProtocol;
	baseUrl: string;
	apiKey: string | null;
}

function joinUrl(baseUrl: string, path: string): string {
	return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

/** Query the provider's model catalog and return a sorted list of model ids. */
export async function listProviderModels(
	input: ListModelsInput,
): Promise<string[]> {
	if (!input.baseUrl) throw new Error("No base URL configured for AI provider");

	const url = joinUrl(input.baseUrl, "/models");
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (input.protocol === "anthropic") {
		if (input.apiKey) headers["x-api-key"] = input.apiKey;
		headers["anthropic-version"] = "2023-06-01";
	} else if (input.apiKey) {
		headers.Authorization = `Bearer ${input.apiKey}`;
	}

	const res = await fetch(url, {
		method: "GET",
		headers,
		signal: AbortSignal.timeout(CONFIG.AI.REQUEST_TIMEOUT_MS),
	});

	if (!res.ok) {
		const body = (await res.text()).slice(0, 300);
		throw new Error(`provider returned ${res.status}: ${body}`);
	}

	const data = (await res.json()) as ModelListResponse;
	const ids = (data.data ?? [])
		.map((m) => (typeof m.id === "string" ? m.id : ""))
		.filter((id) => id.length > 0);
	// De-duplicate (some gateways repeat ids) and sort for a stable picker order.
	return Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b));
}
