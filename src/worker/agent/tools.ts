/**
 * Agent tool contracts and the tool collector.
 *
 * Everything the agent loop can call implements one `AgentTool` interface.
 * Tools come from independent providers, each contributing zero or more
 * tools at runtime:
 *   - data-hub sources (datahub-tools.ts) — discovered from the hub catalog
 *   - built-in skills  (skills.ts)        — local functions
 *   - MCP servers      (mcp.ts)           — discovered via tools/list
 *
 * `collectAgentTools` gathers them all; nothing upstream hardcodes a tool
 * name, so the toolset is open-ended: new sources, skills or MCP servers
 * appear to the model automatically.
 */

import type { AiToolDef } from "../ai/client";
import type { Env } from "../api-worker";
import type { ArtifactRef } from "../../artifacts/types";
import { dataViewTools } from "./data-view-tools";
import { datahubTools } from "./datahub-tools";
import { mcpTools } from "./mcp";
import { skillTools } from "./skills";

export interface AgentTool extends AiToolDef {
	/** Run the tool; the returned string is fed back to the model verbatim. */
	execute(args: Record<string, unknown>, env: Env): Promise<string>;
	/**
	 * Per-tool execution timeout. Defaults to CONFIG.AGENT.TOOL_TIMEOUT_MS.
	 * LLM-backed tools (e.g. card-deck generation) are far slower than a data
	 * fetch and set a larger value so they are not cut off mid-generation.
	 */
	timeoutMs?: number;
}

/**
 * Per-request context for tool providers. `secrets` maps secret param names
 * (as declared by data-hub sources, e.g. "tavily_api_key") to resolved
 * values; providers inject them server-side so the model never sees a key.
 */
export interface AgentContext {
	secrets: Record<string, string>;
	/**
	 * Artifact-creation context. When present, the agent gains a
	 * `create_data_view` tool that persists a chat-generated data view and pushes
	 * each created view's reference onto `created` so the request handler can
	 * attach it to the AI reply after the run.
	 */
	artifacts?: {
		owner: string;
		chatId?: string;
		created: ArtifactRef[];
	};
	/**
	 * The request's execution context, when available. Lets a tool schedule
	 * background work (e.g. the data-view fetch pipeline) via `waitUntil` so the
	 * chat reply returns immediately while the work finishes after the response.
	 */
	executionCtx?: { waitUntil(promise: Promise<unknown>): void };
}

export const EMPTY_AGENT_CONTEXT: AgentContext = { secrets: {} };

/** Restrict a tool name to what every provider accepts: [A-Za-z0-9_-], ≤64. */
export function sanitizeToolName(raw: string): string {
	return raw.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
}

/** Gather tools from all providers (each fails independently to []). */
export async function collectAgentTools(
	env: Env,
	ctx: AgentContext = EMPTY_AGENT_CONTEXT,
): Promise<AgentTool[]> {
	const [hub, skills, mcp] = await Promise.all([
		datahubTools(env, ctx).catch((e) => {
			console.warn("[Agent] datahub tools unavailable:", String(e));
			return [] as AgentTool[];
		}),
		Promise.resolve(skillTools()),
		mcpTools(env).catch((e) => {
			console.warn("[Agent] MCP tools unavailable:", String(e));
			return [] as AgentTool[];
		}),
	]);

	// Built-in artifact tools (only when the request supplies artifact context).
	const artifacts = await dataViewTools(env, ctx).catch((e) => {
		console.warn("[Agent] data-view tools unavailable:", String(e));
		return [] as AgentTool[];
	});

	// First provider wins on a name collision so a remote server cannot
	// shadow a built-in skill or hub source.
	const byName = new Map<string, AgentTool>();
	for (const tool of [...artifacts, ...hub, ...skills, ...mcp]) {
		if (!byName.has(tool.name)) byName.set(tool.name, tool);
		else console.warn("[Agent] duplicate tool name skipped:", tool.name);
	}

	const tools = [...byName.values()];
	console.log(
		"[Agent] tools available:",
		tools.map((t) => t.name).join(", ") || "(none)",
	);
	return tools;
}
