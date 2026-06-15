// Research generation trace — the structured record of ONE research generation
// run (an outline tree or a single node's article). Unlike the chat agent loop
// (which has tool calls and iterations), research generation is a fixed
// pipeline: build the prompt → call the model → parse/validate the JSON → and,
// if the first reply is malformed, a non-streamed repair retry. This trace
// captures every step (with the exact messages sent and the raw model output)
// so the generation can be inspected for debugging from the UI.
//
// Lives in src/research so both the worker (which builds the trace during
// generation) and the client (which renders it in ResearchTraceModal) share one
// definition. The trace is NOT persisted in the D1 snapshot — it is an
// in-session debugging aid carried alongside the generation result.

/** Which kind of generation produced this trace. */
export type ResearchTraceKind = "outline" | "content";

/** Outcome of one pipeline step. */
export type ResearchTraceStepStatus = "ok" | "error" | "info";

/** One message exactly as it was sent to the model (no API keys are ever part
 *  of a message — credentials live in request headers, never in the prompt). */
export interface ResearchTraceMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** One step of the generation pipeline. */
export interface ResearchTraceStep {
  /** Short human label, e.g. "构建提示词" / "模型请求" / "解析校验" / "修复重试". */
  label: string;
  status: ResearchTraceStepStatus;
  /** One-line human detail (e.g. "JSON 校验通过", "非流式", "2 条消息"). */
  detail?: string;
  /** Messages sent to the model (present on prompt/request steps). */
  messages?: ResearchTraceMessage[];
  /** Raw model output text (present on response steps). */
  raw?: string;
  /** Whether this model call streamed its tokens (content mode). */
  streamed?: boolean;
  /** Error string when `status === "error"`. */
  error?: string;
  /** Wall-clock duration of this step in milliseconds. */
  durationMs?: number;
}

/** The full record of one research generation run. */
export interface ResearchGenerationTrace {
  kind: ResearchTraceKind;
  provider: string;
  /** Model id; empty string when the provider config carries no explicit model. */
  model: string;
  /** Root research topic for context. */
  topic?: string;
  /** The follow-up question being expanded (content mode only). */
  question?: string;
  /** Ordered pipeline steps, in execution order. */
  steps: ResearchTraceStep[];
  /** True when a repair retry was triggered (first reply failed the contract). */
  repaired: boolean;
  /** Total wall-clock duration in milliseconds. */
  durationMs: number;
  /** Whether the run produced a contract-valid result. */
  ok: boolean;
  /** Top-level failure reason when `ok === false`. */
  error?: string;
  /** Run start time (ms epoch), for display. */
  createdAt: number;
}

/** Cap on any single captured text blob (prompt content / raw output). Prompts
 *  and replies are bounded by the generation request, but a defensive cap keeps
 *  a pathological reply from bloating the in-session trace payload. */
export const MAX_TRACE_TEXT = 24_000;

/** Truncate a captured blob to {@link MAX_TRACE_TEXT}, annotating the cut. */
export function capTraceText(text: string): string {
  if (text.length <= MAX_TRACE_TEXT) return text;
  const dropped = text.length - MAX_TRACE_TEXT;
  return `${text.slice(0, MAX_TRACE_TEXT)}\n…（已截断 ${dropped} 字符）`;
}

/** Map sent messages to trace messages, capping each body. */
export function toTraceMessages(
  messages: ReadonlyArray<{ role: "system" | "user" | "assistant"; content: string }>,
): ResearchTraceMessage[] {
  return messages.map((m) => ({ role: m.role, content: capTraceText(m.content) }));
}
