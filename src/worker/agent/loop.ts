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
 * Safety rails: an iteration cap (after which the model must answer from
 * what it has), a per-tool timeout, and result truncation. With no tools
 * available the loop degrades to one plain completion.
 */

import {
	generateAgentTurn,
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
	trace: AgentToolTrace[],
): Promise<string> {
	const tool = tools.find((t) => t.name === call.name);
	if (!tool) {
		trace.push({ tool: call.name, ok: false });
		return `Error: unknown tool '${call.name}'`;
	}
	try {
		const output = await withTimeout(
			tool.execute(call.arguments, env),
			CONFIG.AGENT.TOOL_TIMEOUT_MS,
			call.name,
		);
		trace.push({ tool: call.name, ok: true });
		console.log("[Agent] tool '%s' ok (%d chars)", call.name, output.length);
		return output;
	} catch (error) {
		trace.push({ tool: call.name, ok: false });
		console.warn("[Agent] tool '%s' failed: %s", call.name, String(error));
		// The model sees the failure and can retry differently or answer without it.
		return `Error: ${String(error)}`;
	}
}

/**
 * Run the agent loop over `baseMessages` and return the final reply text
 * plus a trace of every tool invocation.
 */
export async function runAgentLoop(
	env: Env,
	cfg: AiRuntimeConfig,
	baseMessages: AgentChatMessage[],
	ctx: AgentContext = EMPTY_AGENT_CONTEXT,
): Promise<AgentRunResult> {
	const tools = await collectAgentTools(env, ctx);
	const toolsUsed: AgentToolTrace[] = [];
	const messages: AgentChatMessage[] = [...baseMessages];

	for (let i = 0; i < CONFIG.AGENT.MAX_ITERATIONS; i++) {
		// On the final iteration no tools are offered, forcing a plain answer.
		const offered = i === CONFIG.AGENT.MAX_ITERATIONS - 1 ? [] : tools;
		const turn = await generateAgentTurn(cfg, messages, offered);

		if (turn.toolCalls.length === 0) {
			if (!turn.text) throw new Error("agent loop ended without a reply");
			return { text: turn.text, toolsUsed };
		}

		console.log(
			"[Agent] iteration %d: %d tool call(s): %s",
			i + 1,
			turn.toolCalls.length,
			turn.toolCalls.map((tc) => `${tc.name}(${JSON.stringify(tc.arguments)})`).join(", "),
		);

		messages.push({ role: "assistant", content: turn.text, toolCalls: turn.toolCalls });
		const outputs = await Promise.all(
			turn.toolCalls.map((call) => executeToolCall(call, tools, env, toolsUsed)),
		);
		turn.toolCalls.forEach((call, idx) => {
			messages.push({
				role: "tool",
				toolCallId: call.id,
				name: call.name,
				content: truncate(outputs[idx], CONFIG.AGENT.MAX_TOOL_RESULT_CHARS),
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
