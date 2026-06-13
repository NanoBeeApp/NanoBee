/**
 * Thin client for the NanoBee data hub (NanoBee-data-hub).
 *
 * The data hub is the single gateway for all external public data. We never
 * call third-party data APIs directly — we discover what the hub offers via
 * its catalog and invoke sources by id. Because discovery is data-driven,
 * NanoBee needs no per-source code: a new source in the hub is usable here
 * the moment it is registered.
 *
 * The hub base URL comes from the DATA_HUB_URL binding; when it is unset the
 * client is disabled and the agent simply gets no data-hub tools.
 */

import type { Env } from "../api-worker";
import { CONFIG } from "../config";

/** A parameter a source accepts (mirrors the hub's SourceParam). */
export interface DataSourceParam {
	name: string;
	type: "string" | "number" | "boolean";
	description: string;
	required?: boolean;
	enum?: string[];
	default?: string | number | boolean;
	/** Credential-bearing param: injected server-side, never shown to the model. */
	secret?: boolean;
}

/** One entry in the hub catalog (mirrors the hub's SourceDescriptor). */
export interface DataSourceDescriptor {
	id: string;
	name: string;
	description: string;
	params: DataSourceParam[];
}

/** Normalized result the hub returns for a source invocation. */
export interface DataSourceResult {
	source: string;
	fetchedAt: string;
	summary: string;
	items: unknown[];
}

function hubBaseUrl(env: Env): string | null {
	const url = env.DATA_HUB_URL?.trim();
	return url ? url.replace(/\/+$/, "") : null;
}

/**
 * Fetch with one retry. Loopback connections between local workerd dev
 * servers occasionally drop with "Network connection lost"; a single retry
 * smooths that transient without masking real failures. Harmless in prod,
 * where the hub is reached over a normal network.
 */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
	try {
		return await fetch(url, init);
	} catch (error) {
		console.warn("[DataHub] fetch retry after:", String(error));
		return await fetch(url, init);
	}
}

/** Whether the data hub is configured for this environment. */
export function isDataHubEnabled(env: Env): boolean {
	return hubBaseUrl(env) !== null;
}

/** Fetch the catalog of available data sources, or [] when disabled/unreachable. */
export async function listDataSources(env: Env): Promise<DataSourceDescriptor[]> {
	const base = hubBaseUrl(env);
	if (!base) return [];
	try {
		const res = await fetchWithRetry(`${base}/api/sources`, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(CONFIG.DATA_HUB.REQUEST_TIMEOUT_MS),
		});
		if (!res.ok) {
			console.warn("[DataHub] catalog fetch returned", res.status);
			return [];
		}
		const data = (await res.json()) as { sources?: DataSourceDescriptor[] };
		return data.sources ?? [];
	} catch (error) {
		console.warn("[DataHub] catalog fetch failed:", String(error));
		return [];
	}
}

/** Invoke a source by id with params, or null when disabled/unreachable. */
export async function invokeDataSource(
	env: Env,
	id: string,
	params: Record<string, string | number | boolean>,
): Promise<DataSourceResult | null> {
	const base = hubBaseUrl(env);
	if (!base) return null;
	try {
		const res = await fetchWithRetry(`${base}/api/sources/${encodeURIComponent(id)}/fetch`, {
			method: "POST",
			headers: { "Content-Type": "application/json", Accept: "application/json" },
			body: JSON.stringify(params ?? {}),
			signal: AbortSignal.timeout(CONFIG.DATA_HUB.REQUEST_TIMEOUT_MS),
		});
		if (!res.ok) {
			console.warn("[DataHub] source '%s' fetch returned %d", id, res.status);
			return null;
		}
		return (await res.json()) as DataSourceResult;
	} catch (error) {
		console.warn("[DataHub] source '%s' fetch failed: %s", id, String(error));
		return null;
	}
}
