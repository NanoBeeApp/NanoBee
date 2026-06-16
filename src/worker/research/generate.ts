// Research node generation: drive the configured AI model with the research
// prompt, validate the reply against the contract, and retry once with a
// repair instruction if the first reply is malformed.
//
// Reuses NanoBee's existing chat client (`generateChatText`) so research
// generation rides on the same per-user provider settings as chat — this is
// the "reuse the AI config" integration point with Curve's feature.
//
// Every run also builds a `ResearchGenerationTrace` (prompts sent, raw model
// output, parse/repair steps, timing). On success the trace is attached to the
// result; on failure it is carried out on a `ResearchGenerationError` so the
// UI can still show how a failed generation unfolded — debugging matters most
// exactly when generation fails.

import type { AiRuntimeConfig } from "../ai/settings";
import { generateChatText, streamAgentText, type AiChatMessage } from "../ai/client";
import { parseModelPayload } from "../../research/contract";
import { buildResearchMessages, REPAIR_INSTRUCTION } from "../../research/prompt";
import {
  capTraceText,
  toTraceMessages,
  type ResearchGenerationTrace,
  type ResearchTraceKind,
} from "../../research/generation-trace";
import type {
  ResearchGenerationInput,
  ResearchGenerationResult,
} from "../../research/types";

/** Raised when generation cannot produce a contract-valid result. Carries the
 *  partial trace so the route can return it for debugging the failure. */
export class ResearchGenerationError extends Error {
  constructor(
    message: string,
    public readonly trace: ResearchGenerationTrace,
  ) {
    super(message);
    this.name = "ResearchGenerationError";
  }
}

// Research replies are the largest payloads NanoBee asks a model for. Outline
// mode is the worst case: a strict-JSON `outline` title tree PLUS a full
// mirrored `outlineBriefs` tree (every title duplicated, each node carrying a
// ≤120-char brief) for a 5–8 node, 2–5 children-each tree — easily ~8–11k
// output tokens, and on a reasoning default model that budget is also shared
// with the hidden reasoning trace, so the old 4k cap truncated the JSON
// mid-string → invalid JSON → both the first parse and the repair retry failed
// → the route 502'd. Give it a budget that comfortably fits the whole tree (a
// ceiling, not a target — the model stops when the JSON closes). The timeout is
// generous because the default DeepSeek V4 Flash is slow on a payload this
// large (~100s observed); each model call (incl. the repair retry) gets its
// own window.
const CALL_OPTS = { maxTokens: 16_000, timeoutMs: 150_000 } as const;

/** The mode that produced this run: explicit, else inferred from `question`. */
function deriveKind(input: ResearchGenerationInput): ResearchTraceKind {
  return input.generationMode ?? (input.question ? "content" : "outline");
}

/** Start a fresh trace for one generation run. */
function newTrace(
  cfg: AiRuntimeConfig,
  input: ResearchGenerationInput,
  startedAt: number,
): ResearchGenerationTrace {
  return {
    kind: deriveKind(input),
    provider: cfg.provider,
    model: cfg.model ?? "",
    topic: input.topic,
    question: input.question,
    steps: [],
    repaired: false,
    durationMs: 0,
    ok: false,
    createdAt: startedAt,
  };
}

/**
 * Generate one research node (outline or article). Throws a
 * {@link ResearchGenerationError} (carrying the trace) if the model is
 * unreachable or the reply cannot be coerced into a contract-valid payload
 * after one repair retry.
 */
export async function generateResearchNode(
  cfg: AiRuntimeConfig,
  input: ResearchGenerationInput,
): Promise<ResearchGenerationResult> {
  const startedAt = Date.now();
  const trace = newTrace(cfg, input, startedAt);

  const { system, user } = buildResearchMessages(input);
  const messages: AiChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  trace.steps.push({
    label: "构建提示词",
    status: "ok",
    detail: `${messages.length} 条消息（system + user）`,
    messages: toTraceMessages(messages),
  });

  // First model call (non-streamed).
  const raw = await callModel(cfg, messages, trace, startedAt, "模型请求", false);

  try {
    const payload = parseModelPayload(raw);
    trace.steps.push({ label: "解析校验", status: "ok", detail: "JSON 校验通过" });
    return finalize(payload, cfg, trace, startedAt);
  } catch (firstError) {
    // One repair attempt: re-send with the prior (bad) reply + a strict
    // instruction. Many models recover from a malformed first JSON this way.
    console.warn(
      "[research] first reply failed contract, retrying with repair:",
      String(firstError),
    );
    return repairAndFinalize(cfg, messages, raw, firstError, trace, startedAt, false);
  }
}

/**
 * Streaming variant of {@link generateResearchNode} for content mode. Streams
 * the raw model tokens through `onDelta` (so the client can render the article
 * as it arrives), then validates the full reply against the contract — with one
 * NON-streamed repair retry if the first reply is malformed. Returns the same
 * validated result shape (with trace attached) as the non-streamed path.
 *
 * Note: when the streamed reply fails the contract, the (bad) tokens have
 * already reached the client; the repair runs non-streamed and its
 * authoritative result is what the client persists, so it overwrites them.
 */
export async function generateResearchNodeStream(
  cfg: AiRuntimeConfig,
  input: ResearchGenerationInput,
  onDelta: (delta: string) => void | Promise<void>,
): Promise<ResearchGenerationResult> {
  const startedAt = Date.now();
  const trace = newTrace(cfg, input, startedAt);

  const { system, user } = buildResearchMessages(input);
  const messages: AiChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  trace.steps.push({
    label: "构建提示词",
    status: "ok",
    detail: `${messages.length} 条消息（system + user）`,
    messages: toTraceMessages(messages),
  });

  // First model call (streamed).
  const t0 = Date.now();
  let raw: string;
  try {
    raw = await streamAgentText(cfg, messages, onDelta, CALL_OPTS);
  } catch (err) {
    trace.steps.push({
      label: "模型请求",
      status: "error",
      detail: "流式",
      streamed: true,
      error: capTraceText(String(err)),
      durationMs: Date.now() - t0,
    });
    throw fail(trace, startedAt, String(err));
  }
  trace.steps.push({
    label: "模型请求",
    status: "ok",
    detail: "流式",
    streamed: true,
    raw: capTraceText(raw),
    durationMs: Date.now() - t0,
  });

  try {
    const payload = parseModelPayload(raw);
    trace.steps.push({ label: "解析校验", status: "ok", detail: "JSON 校验通过" });
    return finalize(payload, cfg, trace, startedAt);
  } catch (firstError) {
    console.warn(
      "[research] streamed reply failed contract, repairing (non-streamed):",
      String(firstError),
    );
    return repairAndFinalize(cfg, messages, raw, firstError, trace, startedAt, true);
  }
}

/** Run one non-streamed model call, recording an ok/error step on the trace.
 *  Throws a {@link ResearchGenerationError} (carrying the trace) on failure. */
async function callModel(
  cfg: AiRuntimeConfig,
  messages: AiChatMessage[],
  trace: ResearchGenerationTrace,
  startedAt: number,
  label: string,
  streamed: false,
): Promise<string> {
  const t0 = Date.now();
  try {
    const raw = await generateChatText(cfg, messages, CALL_OPTS);
    trace.steps.push({
      label,
      status: "ok",
      detail: "非流式",
      streamed,
      raw: capTraceText(raw),
      durationMs: Date.now() - t0,
    });
    return raw;
  } catch (err) {
    trace.steps.push({
      label,
      status: "error",
      detail: "非流式",
      streamed,
      error: capTraceText(String(err)),
      durationMs: Date.now() - t0,
    });
    throw fail(trace, startedAt, String(err));
  }
}

/** Shared repair path: record the failed parse, re-prompt with the bad reply +
 *  repair instruction (non-streamed), parse again, and finalize. */
async function repairAndFinalize(
  cfg: AiRuntimeConfig,
  messages: AiChatMessage[],
  badRaw: string,
  firstError: unknown,
  trace: ResearchGenerationTrace,
  startedAt: number,
  firstWasStreamed: boolean,
): Promise<ResearchGenerationResult> {
  trace.steps.push({
    label: "解析校验",
    status: "error",
    detail: firstWasStreamed ? "流式首答未通过校验" : "首答未通过校验",
    error: capTraceText(String(firstError)),
  });
  trace.repaired = true;

  const repairMessages: AiChatMessage[] = [
    ...messages,
    { role: "assistant", content: badRaw },
    {
      role: "user",
      content: `${REPAIR_INSTRUCTION}\n(Reason previous output failed: ${String(
        firstError,
      ).slice(0, 200)})`,
    },
  ];
  trace.steps.push({
    label: "修复重试 · 提示词",
    status: "info",
    detail: "附带上次错误输出 + 修复指令",
    messages: toTraceMessages(repairMessages),
  });

  const repairedRaw = await callModel(
    cfg,
    repairMessages,
    trace,
    startedAt,
    "修复重试 · 模型请求",
    false,
  );

  try {
    const payload = parseModelPayload(repairedRaw);
    trace.steps.push({ label: "解析校验（重试）", status: "ok", detail: "JSON 校验通过" });
    return finalize(payload, cfg, trace, startedAt);
  } catch (secondError) {
    trace.steps.push({
      label: "解析校验（重试）",
      status: "error",
      detail: "重试后仍未通过校验",
      error: capTraceText(String(secondError)),
    });
    throw fail(trace, startedAt, String(secondError));
  }
}

/** Stamp the trace as failed and wrap it in a throwable error. */
function fail(
  trace: ResearchGenerationTrace,
  startedAt: number,
  message: string,
): ResearchGenerationError {
  trace.ok = false;
  trace.error = message;
  trace.durationMs = Date.now() - startedAt;
  return new ResearchGenerationError(message, trace);
}

function finalize(
  payload: ReturnType<typeof parseModelPayload>,
  cfg: AiRuntimeConfig,
  trace: ResearchGenerationTrace,
  startedAt: number,
): ResearchGenerationResult {
  trace.ok = true;
  trace.durationMs = Date.now() - startedAt;
  return {
    content: payload.content,
    questions: payload.questions,
    summary: payload.summary,
    outline: payload.outline,
    tags: payload.tags,
    metadata: { provider: cfg.provider, model: cfg.model },
    trace,
  };
}
