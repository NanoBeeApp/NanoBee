/**
 * Data-hub tool provider: every source in the hub catalog becomes an agent
 * tool named `datahub_<sourceId>`. Discovery is fully data-driven — when a
 * new source is registered in the hub, the agent can call it on the next
 * request with no change here.
 */

import type { Env } from "../api-worker";
import {
	type DataSourceParam,
	invokeDataSource,
	listDataSources,
} from "../datahub/client";
import { sanitizeToolName, type AgentTool } from "./tools";

/** Convert a source's declared params into a JSON Schema object. */
function paramsToJsonSchema(params: DataSourceParam[]): Record<string, unknown> {
	const properties: Record<string, unknown> = {};
	const required: string[] = [];
	for (const p of params) {
		properties[p.name] = {
			type: p.type,
			description: p.description,
			...(p.enum ? { enum: p.enum } : {}),
			...(p.default !== undefined ? { default: p.default } : {}),
		};
		if (p.required) required.push(p.name);
	}
	return { type: "object", properties, ...(required.length ? { required } : {}) };
}

/** Keep only primitive argument values (what sources accept). */
function primitiveArgs(
	args: Record<string, unknown>,
): Record<string, string | number | boolean> {
	const out: Record<string, string | number | boolean> = {};
	for (const [k, v] of Object.entries(args)) {
		if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
			out[k] = v;
		}
	}
	return out;
}

export async function datahubTools(env: Env): Promise<AgentTool[]> {
	const sources = await listDataSources(env);
	return sources.map((s) => ({
		name: sanitizeToolName(`datahub_${s.id}`),
		description: s.description,
		parameters: paramsToJsonSchema(s.params),
		execute: async (args, e) => {
			const result = await invokeDataSource(e, s.id, primitiveArgs(args));
			if (!result?.summary) {
				throw new Error(`data source '${s.id}' returned no data`);
			}
			return result.summary;
		},
	}));
}
