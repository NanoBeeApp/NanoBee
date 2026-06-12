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
import { datahubTools } from "./datahub-tools";
import { mcpTools } from "./mcp";
import { skillTools } from "./skills";

export interface AgentTool extends AiToolDef {
	/** Run the tool; the returned string is fed back to the model verbatim. */
	execute(args: Record<string, unknown>, env: Env): Promise<string>;
}

/** Restrict a tool name to what every provider accepts: [A-Za-z0-9_-], ≤64. */
export function sanitizeToolName(raw: string): string {
	return raw.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
}

/** Gather tools from all providers (each fails independently to []). */
export async function collectAgentTools(env: Env): Promise<AgentTool[]> {
	const [hub, skills, mcp] = await Promise.all([
		datahubTools(env).catch((e) => {
			console.warn("[Agent] datahub tools unavailable:", String(e));
			return [] as AgentTool[];
		}),
		Promise.resolve(skillTools()),
		mcpTools(env).catch((e) => {
			console.warn("[Agent] MCP tools unavailable:", String(e));
			return [] as AgentTool[];
		}),
	]);

	// First provider wins on a name collision so a remote server cannot
	// shadow a built-in skill or hub source.
	const byName = new Map<string, AgentTool>();
	for (const tool of [...hub, ...skills, ...mcp]) {
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
