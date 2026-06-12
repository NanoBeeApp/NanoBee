/**
 * MCP tool provider: connect to configured MCP servers and expose their
 * tools to the agent loop.
 *
 * Servers are declared in the MCP_SERVERS binding as JSON, e.g.
 *   {"datahub": "http://127.0.0.1:3344/mcp"}
 * Each server's tools are discovered via JSON-RPC `tools/list` and exposed
 * as `mcp_<server>_<tool>`; calls go through `tools/call`. The client speaks
 * MCP streamable HTTP (single POST endpoint) and tolerates both plain-JSON
 * and SSE-framed responses, with or without a session id.
 */

import type { Env } from "../api-worker";
import { CONFIG } from "../config";
import { sanitizeToolName, type AgentTool } from "./tools";

const PROTOCOL_VERSION = "2025-03-26";

interface McpServer {
	name: string;
	url: string;
}

interface McpToolInfo {
	name: string;
	description?: string;
	inputSchema?: Record<string, unknown>;
}

interface JsonRpcResponse {
	result?: Record<string, unknown>;
	error?: { code?: number; message?: string };
}

/** Parse the MCP_SERVERS binding: {"name": "url", ...} or [{name, url}, ...]. */
function configuredServers(env: Env): McpServer[] {
	const raw = env.MCP_SERVERS?.trim();
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (Array.isArray(parsed)) {
			return parsed.filter(
				(s): s is McpServer =>
					typeof (s as McpServer)?.name === "string" &&
					typeof (s as McpServer)?.url === "string",
			);
		}
		if (parsed && typeof parsed === "object") {
			return Object.entries(parsed as Record<string, unknown>)
				.filter(([, url]) => typeof url === "string")
				.map(([name, url]) => ({ name, url: url as string }));
		}
	} catch (error) {
		console.warn("[MCP] invalid MCP_SERVERS JSON:", String(error));
	}
	return [];
}

/** Extract the JSON-RPC payload from a plain-JSON or SSE-framed response. */
async function readJsonRpc(res: Response): Promise<JsonRpcResponse | null> {
	const text = await res.text();
	if (!text) return null;
	if ((res.headers.get("content-type") ?? "").includes("text/event-stream")) {
		// Last `data:` line wins — responses are single-message in practice.
		const dataLines = text
			.split("\n")
			.filter((l) => l.startsWith("data:"))
			.map((l) => l.slice(5).trim());
		for (const line of dataLines.reverse()) {
			try {
				return JSON.parse(line) as JsonRpcResponse;
			} catch {
				/* keep scanning */
			}
		}
		return null;
	}
	return JSON.parse(text) as JsonRpcResponse;
}

/** A minimal JSON-RPC-over-HTTP session against one MCP server. */
class McpConnection {
	private sessionId: string | null = null;
	private nextId = 1;

	constructor(private readonly server: McpServer) {}

	private async post(body: Record<string, unknown>): Promise<Response> {
		return fetch(this.server.url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json, text/event-stream",
				...(this.sessionId ? { "Mcp-Session-Id": this.sessionId } : {}),
			},
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(CONFIG.DATA_HUB.REQUEST_TIMEOUT_MS),
		});
	}

	private async call(
		method: string,
		params?: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		const res = await this.post({
			jsonrpc: "2.0",
			id: this.nextId++,
			method,
			...(params ? { params } : {}),
		});
		this.sessionId = res.headers.get("Mcp-Session-Id") ?? this.sessionId;
		if (!res.ok) {
			throw new Error(`MCP ${this.server.name} ${method} returned HTTP ${res.status}`);
		}
		const rpc = await readJsonRpc(res);
		if (!rpc) throw new Error(`MCP ${this.server.name} ${method}: empty response`);
		if (rpc.error) {
			throw new Error(`MCP ${this.server.name} ${method}: ${rpc.error.message}`);
		}
		return rpc.result ?? {};
	}

	async initialize(): Promise<void> {
		await this.call("initialize", {
			protocolVersion: PROTOCOL_VERSION,
			capabilities: {},
			clientInfo: { name: "NanoBee", version: "0.1.0" },
		});
		// Spec-mandated notification; stateless servers may 4xx it — ignore.
		await this.post({ jsonrpc: "2.0", method: "notifications/initialized" }).catch(
			() => undefined,
		);
	}

	async listTools(): Promise<McpToolInfo[]> {
		const result = await this.call("tools/list");
		return Array.isArray(result.tools) ? (result.tools as McpToolInfo[]) : [];
	}

	async callTool(name: string, args: Record<string, unknown>): Promise<string> {
		const result = await this.call("tools/call", { name, arguments: args });
		const content = Array.isArray(result.content)
			? (result.content as { type?: string; text?: string }[])
			: [];
		const text = content
			.filter((b) => b.type === "text" && b.text)
			.map((b) => b.text)
			.join("\n");
		if (result.isError) {
			throw new Error(text || `MCP tool '${name}' reported an error`);
		}
		return text || "(empty result)";
	}
}

/** Discover tools from every configured MCP server (failures are per-server). */
export async function mcpTools(env: Env): Promise<AgentTool[]> {
	const servers = configuredServers(env);
	if (servers.length === 0) return [];

	const perServer = await Promise.all(
		servers.map(async (server): Promise<AgentTool[]> => {
			try {
				const conn = new McpConnection(server);
				await conn.initialize();
				const tools = await conn.listTools();
				return tools.map((t) => ({
					name: sanitizeToolName(`mcp_${server.name}_${t.name}`),
					description: t.description ?? `Tool '${t.name}' on MCP server '${server.name}'`,
					parameters: t.inputSchema ?? { type: "object", properties: {} },
					execute: (args) => conn.callTool(t.name, args),
				}));
			} catch (error) {
				console.warn("[MCP] server '%s' unavailable: %s", server.name, String(error));
				return [];
			}
		}),
	);
	return perServer.flat();
}
