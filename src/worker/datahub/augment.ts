/**
 * Context augmentation: ground a chat reply in live data from the data hub.
 *
 * The flow that makes this open-ended (no hardcoded "if the user asks about
 * HN" branch anywhere):
 *   1. Pull the data-hub catalog (what sources exist + their params).
 *   2. Ask the model to ROUTE: given the question and the catalog, pick at
 *      most one source and its params, or none. The catalog is the only
 *      source of truth, so a new source added to the hub is instantly usable.
 *   3. Invoke the chosen source and turn its `summary` into a system message
 *      the answering model reads as grounding context.
 *
 * Every step degrades gracefully: no hub, empty catalog, router declines, or
 * a failed fetch all return [] so the chat still answers from the model alone.
 */

import { generateChatText } from "../ai/client";
import type { AiChatMessage } from "../ai/client";
import type { AiRuntimeConfig } from "../ai/settings";
import type { Env } from "../api-worker";
import { CONFIG } from "../config";
import {
	type DataSourceDescriptor,
	invokeDataSource,
	listDataSources,
} from "./client";

/** A source choice the router LLM returns. */
interface RouteDecision {
	source: string | null;
	params?: Record<string, string | number | boolean>;
}

/** Result of augmentation: context messages plus which source (if any) fed them. */
export interface AugmentResult {
	messages: AiChatMessage[];
	usedSource: string | null;
}

const EMPTY: AugmentResult = { messages: [], usedSource: null };

/** Build the router system prompt from the live catalog. */
function routerPrompt(sources: DataSourceDescriptor[]): string {
	const catalog = sources.map((s) => ({
		id: s.id,
		description: s.description,
		params: s.params.map((p) => ({
			name: p.name,
			type: p.type,
			required: p.required ?? false,
			description: p.description,
		})),
	}));
	return [
		"You route a user question to at most one live data source.",
		"Only pick a source when its data is genuinely needed to answer; otherwise pick none.",
		"Available data sources (JSON):",
		JSON.stringify(catalog),
		'Reply with ONLY a JSON object, no prose, no code fence: {"source": "<id>"|null, "params": {<name>: <value>}}.',
		'If no source helps, reply exactly {"source": null}.',
	].join("\n");
}

/** Best-effort parse of the router's JSON reply (tolerates code fences/prose). */
function parseDecision(text: string): RouteDecision | null {
	const match = text.match(/\{[\s\S]*\}/);
	if (!match) return null;
	try {
		const obj = JSON.parse(match[0]) as RouteDecision;
		if (typeof obj.source !== "string" && obj.source !== null) return null;
		return obj;
	} catch {
		return null;
	}
}

/**
 * Decide whether live data helps answer `userText` and, if so, fetch it and
 * return grounding context messages to prepend to the answering call.
 */
export async function augmentWithData(
	env: Env,
	aiConfig: AiRuntimeConfig,
	userText: string,
): Promise<AugmentResult> {
	if (!aiConfig.apiKey) return EMPTY;

	const sources = await listDataSources(env);
	if (sources.length === 0) return EMPTY;
	const offered = sources.slice(0, CONFIG.DATA_HUB.MAX_SOURCES_IN_PROMPT);

	// Step 2 — route. A single short completion picks the source + params.
	let decision: RouteDecision | null = null;
	try {
		const reply = await generateChatText(aiConfig, [
			{ role: "system", content: routerPrompt(offered) },
			{ role: "user", content: userText },
		]);
		decision = parseDecision(reply);
	} catch (error) {
		console.warn("[DataHub] router call failed:", String(error));
		return EMPTY;
	}

	if (!decision || !decision.source) {
		console.log("[DataHub] router chose no data source");
		return EMPTY;
	}
	if (!offered.some((s) => s.id === decision.source)) {
		console.warn("[DataHub] router picked unknown source:", decision.source);
		return EMPTY;
	}

	// Step 3 — fetch and turn the digest into grounding context.
	const result = await invokeDataSource(env, decision.source, decision.params ?? {});
	if (!result || !result.summary) {
		console.warn("[DataHub] source returned no usable data:", decision.source);
		return EMPTY;
	}

	console.log(
		"[DataHub] grounding reply with source '%s' (%d items)",
		decision.source,
		Array.isArray(result.items) ? result.items.length : 0,
	);
	const content = [
		`实时数据（来自 NanoBee 数据中心，数据源「${decision.source}」，抓取时间 ${result.fetchedAt}）：`,
		result.summary,
		"请基于以上实时数据回答用户的问题；如数据与问题无关再按常识回答。",
	].join("\n");

	return {
		messages: [{ role: "system", content }],
		usedSource: decision.source,
	};
}
