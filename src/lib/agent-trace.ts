/**
 * Agent execution trace — the structured record of one agent-loop run.
 * Built by the worker (agent/loop.ts), persisted inside the AI message
 * payload, and rendered by the debug modal (AgentTraceModal). Lives in
 * src/lib so both sides share one definition.
 */

import type { AiMessage } from "../types";

/** One tool invocation the model requested in an iteration. */
export interface AgentTraceToolCall {
	name: string;
	/** Arguments as the model supplied them (secrets are injected later,
	 *  server-side, and never appear here). */
	arguments: Record<string, unknown>;
	/** Tool output (truncated for storage) or the error string on failure. */
	output: string;
	ok: boolean;
	durationMs: number;
}

/** One model turn: its text (if any) plus the tool calls it requested. */
export interface AgentTraceIteration {
	/** 1-based iteration number. */
	n: number;
	text: string | null;
	toolCalls: AgentTraceToolCall[];
}

/** The full run: configuration, every iteration, and total wall time. */
export interface AgentTrace {
	provider: string;
	model: string;
	/** Names of the tools offered to the model for this run. */
	tools: string[];
	iterations: AgentTraceIteration[];
	durationMs: number;
}

/** An AI message whose payload carries an execution trace. */
export type TracedAiMessage = AiMessage & { trace?: AgentTrace };
