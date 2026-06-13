/**
 * Data-hub tool provider: every source in the hub catalog becomes an agent
 * tool named `datahub_<sourceId>`. Discovery is fully data-driven — when a
 * new source is registered in the hub, the agent can call it on the next
 * request with no change here.
 *
 * Secret params (e.g. a source's `tavily_api_key`) are stripped from the
 * schema the model sees and injected server-side from the request's
 * AgentContext — the model can neither read nor fabricate credentials.
 */

import type { Env } from "../api-worker";
import {
	type DataSourceParam,
	invokeDataSource,
	listDataSources,
} from "../datahub/client";
import { sanitizeToolName, type AgentContext, type AgentTool } from "./tools";

/** Convert the source's non-secret params into a JSON Schema object. */
function paramsToJsonSchema(params: DataSourceParam[]): Record<string, unknown> {
	const properties: Record<string, unknown> = {};
	const required: string[] = [];
	for (const p of params) {
		if (p.secret) continue; // injected server-side, invisible to the model
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

export async function datahubTools(env: Env, ctx: AgentContext): Promise<AgentTool[]> {
	const sources = await listDataSources(env);
	return sources.map((s) => {
		const secretParams = s.params.filter((p) => p.secret);
		return {
			name: sanitizeToolName(`datahub_${s.id}`),
			description: s.description,
			parameters: paramsToJsonSchema(s.params),
			execute: async (args, e) => {
				const params = primitiveArgs(args);
				for (const p of secretParams) {
					// Server-side injection overrides anything the model may have
					// guessed for a secret param name.
					delete params[p.name];
					const value = ctx.secrets[p.name];
					if (value) params[p.name] = value;
					else if (p.required) {
						throw new Error(
							`'${s.id}' is not available: no credential configured for '${p.name}'`,
						);
					}
				}
				const result = await invokeDataSource(e, s.id, params);
				if (!result?.summary) {
					throw new Error(`data source '${s.id}' returned no data`);
				}
				return result.summary;
			},
		};
	});
}
