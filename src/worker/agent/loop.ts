/**
 * The agent loop: iterative tool-calling until the model produces an answer.
 *
 * Each iteration sends the conversation plus all available tools to the
 * model. If it requests tool calls, they run (in parallel within the turn),
 * their results are appended, and the loop continues; when it answers in
 * plain text the loop returns. Replaces single-shot Q&A — the model can
 * chain data fetches, skills and MCP calls, and decide on its own when it
 * has enough to answer.
 *
 * Every run also produces an `AgentTrace` — a structured record of each
 * iteration's text and tool calls (arguments / output / timing) that the
 * frontend debug modal renders.
 *
 * Safety rails: an iteration cap (after which the model must answer from
 * what it has), a per-tool timeout, and result truncation. With no tools
 * available the loop degrades to one plain completion.
 */

import type {
	AgentTrace,
	AgentTraceIteration,
	AgentTraceToolCall,
} from "../../lib/agent-trace";
import {
	generateAgentTurn,
	streamAgentTurn,
	type AgentChatMessage,
	type AiToolCall,
} from "../ai/client";
import type { AiRuntimeConfig } from "../ai/settings";
import type { Env } from "../api-worker";
import { CONFIG } from "../config";
import {
	collectAgentTools,
	EMPTY_AGENT_CONTEXT,
	type AgentContext,
	type AgentTool,
} from "./tools";

/** One executed tool call, for logging/observability. */
export interface AgentToolTrace {
	tool: string;
	ok: boolean;
}

export interface AgentRunResult {
	text: string;
	toolsUsed: AgentToolTrace[];
	trace: AgentTrace;
}

/** Reject if a tool runs past the configured timeout. */
function withTimeout(promise: Promise<string>, ms: number, label: string): Promise<string> {
	return Promise.race([
		promise,
		new Promise<string>((_, reject) =>
			setTimeout(() => reject(new Error(`tool '${label}' timed out after ${ms}ms`)), ms),
		),
	]);
}

function truncate(text: string, max: number): string {
	return text.length > max ? `${text.slice(0, max)}\n…(truncated)` : text;
}

async function executeToolCall(
	call: AiToolCall,
	tools: AgentTool[],
	env: Env,
): Promise<AgentTraceToolCall> {
	const started = Date.now();
	const tool = tools.find((t) => t.name === call.name);
	if (!tool) {
		return {
			name: call.name,
			arguments: call.arguments,
			output: `Error: unknown tool '${call.name}'`,
			ok: false,
			durationMs: Date.now() - started,
		};
	}
	try {
		const output = await withTimeout(
			tool.execute(call.arguments, env),
			tool.timeoutMs ?? CONFIG.AGENT.TOOL_TIMEOUT_MS,
			call.name,
		);
		console.log("[Agent] tool '%s' ok (%d chars)", call.name, output.length);
		return {
			name: call.name,
			arguments: call.arguments,
			output,
			ok: true,
			durationMs: Date.now() - started,
		};
	} catch (error) {
		console.warn("[Agent] tool '%s' failed: %s", call.name, String(error));
		// The model sees the failure and can retry differently or answer without it.
		return {
			name: call.name,
			arguments: call.arguments,
			output: `Error: ${String(error)}`,
			ok: false,
			durationMs: Date.now() - started,
		};
	}
}

/**
 * Run the agent loop over `baseMessages` and return the final reply text,
 * a flat tool-usage summary, and the full execution trace.
 *
 * When `onToken` is supplied, each turn streams its assistant content tokens
 * through it as they arrive (live typewriter); tool-only turns emit nothing, so
 * in the common case only the final answer types out. Without it the loop uses
 * plain non-streamed completions (e.g. the quick chat / fallback JSON path).
 */
export async function runAgentLoop(
	env: Env,
	cfg: AiRuntimeConfig,
	baseMessages: AgentChatMessage[],
	ctx: AgentContext = EMPTY_AGENT_CONTEXT,
	onToken?: (delta: string) => void | Promise<void>,
): Promise<AgentRunResult> {
	const startedAt = Date.now();
	const tools = await collectAgentTools(env, ctx);
	const messages: AgentChatMessage[] = [...baseMessages];
	const iterations: AgentTraceIteration[] = [];

	const finish = (text: string): AgentRunResult => ({
		text,
		toolsUsed: iterations.flatMap((it) =>
			it.toolCalls.map((tc) => ({ tool: tc.name, ok: tc.ok })),
		),
		trace: {
			provider: cfg.provider,
			model: cfg.model,
			tools: tools.map((t) => t.name),
			iterations,
			durationMs: Date.now() - startedAt,
		},
	});

	for (let i = 0; i < CONFIG.AGENT.MAX_ITERATIONS; i++) {
		// On the final iteration no tools are offered, forcing a plain answer.
		const offered = i === CONFIG.AGENT.MAX_ITERATIONS - 1 ? [] : tools;
		const turn = onToken
			? await streamAgentTurn(cfg, messages, offered, onToken)
			: await generateAgentTurn(cfg, messages, offered);

		if (turn.toolCalls.length === 0) {
			if (!turn.text) throw new Error("agent loop ended without a reply");
			iterations.push({ n: i + 1, text: turn.text, toolCalls: [] });
			return finish(turn.text);
		}

		console.log(
			"[Agent] iteration %d: %d tool call(s): %s",
			i + 1,
			turn.toolCalls.length,
			turn.toolCalls.map((tc) => `${tc.name}(${JSON.stringify(tc.arguments)})`).join(", "),
		);

		messages.push({ role: "assistant", content: turn.text, toolCalls: turn.toolCalls });
		const results = await Promise.all(
			turn.toolCalls.map((call) => executeToolCall(call, tools, env)),
		);
		iterations.push({
			n: i + 1,
			text: turn.text,
			// The stored trace keeps a shorter slice than what the model sees.
			toolCalls: results.map((r) => ({
				...r,
				output: truncate(r.output, CONFIG.AGENT.TRACE_MAX_OUTPUT_CHARS),
			})),
		});
		turn.toolCalls.forEach((call, idx) => {
			messages.push({
				role: "tool",
				toolCallId: call.id,
				name: call.name,
				content: truncate(results[idx].output, CONFIG.AGENT.MAX_TOOL_RESULT_CHARS),
			});
		});

		// Last-iteration safety: tell the model to wrap up from what it has.
		if (i === CONFIG.AGENT.MAX_ITERATIONS - 2) {
			messages.push({
				role: "system",
				content: "Tool budget exhausted — answer the user now from the results above.",
			});
		}
	}

	throw new Error("agent loop exceeded max iterations without an answer");
}
