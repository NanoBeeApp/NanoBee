// Research node generation: drive the configured AI model with the research
// prompt, validate the reply against the contract, and retry once with a
// repair instruction if the first reply is malformed.
//
// Reuses NanoBee's existing chat client (`generateChatText`) so research
// generation rides on the same per-user provider settings as chat — this is
// the "reuse the AI config" integration point with Curve's feature.

import type { AiRuntimeConfig } from "../ai/settings";
import { generateChatText, streamAgentText, type AiChatMessage } from "../ai/client";
import { parseModelPayload } from "../../research/contract";
import { buildResearchMessages, REPAIR_INSTRUCTION } from "../../research/prompt";
import type {
  ResearchGenerationInput,
  ResearchGenerationResult,
} from "../../research/types";

/**
 * Generate one research node (outline or article). Throws if the model is
 * unreachable or the reply cannot be coerced into a contract-valid payload
 * after one repair retry.
 */
export async function generateResearchNode(
  cfg: AiRuntimeConfig,
  input: ResearchGenerationInput,
): Promise<ResearchGenerationResult> {
  const { system, user } = buildResearchMessages(input);
  const messages: AiChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  // Research replies are large (outline + brief tree, or a 500–1200 char
  // article in strict JSON) — the global 800-token chat cap truncates them
  // into invalid JSON, so request a much higher budget and longer timeout.
  const callOpts = { maxTokens: 4000, timeoutMs: 90_000 };

  let raw = await generateChatText(cfg, messages, callOpts);
  try {
    return finalize(parseModelPayload(raw), cfg);
  } catch (firstError) {
    // One repair attempt: re-send with the prior (bad) reply + a strict
    // instruction. Many models recover from a malformed first JSON this way.
    console.warn(
      "[research] first reply failed contract, retrying with repair:",
      String(firstError),
    );
    const repairMessages: AiChatMessage[] = [
      ...messages,
      { role: "assistant", content: raw } as AiChatMessage,
      {
        role: "user",
        content: `${REPAIR_INSTRUCTION}\n(Reason previous output failed: ${String(
          firstError,
        ).slice(0, 200)})`,
      },
    ];
    raw = await generateChatText(cfg, repairMessages, callOpts);
    return finalize(parseModelPayload(raw), cfg);
  }
}

/**
 * Streaming variant of {@link generateResearchNode} for content mode. Streams
 * the raw model tokens through `onDelta` (so the client can render the article
 * as it arrives), then validates the full reply against the contract — with one
 * NON-streamed repair retry if the first reply is malformed. Returns the same
 * validated result shape as the non-streamed path.
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
  const { system, user } = buildResearchMessages(input);
  const messages: AiChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  const callOpts = { maxTokens: 4000, timeoutMs: 90_000 };

  const raw = await streamAgentText(cfg, messages, onDelta, callOpts);
  try {
    return finalize(parseModelPayload(raw), cfg);
  } catch (firstError) {
    console.warn(
      "[research] streamed reply failed contract, repairing (non-streamed):",
      String(firstError),
    );
    const repairMessages: AiChatMessage[] = [
      ...messages,
      { role: "assistant", content: raw } as AiChatMessage,
      {
        role: "user",
        content: `${REPAIR_INSTRUCTION}\n(Reason previous output failed: ${String(
          firstError,
        ).slice(0, 200)})`,
      },
    ];
    const repaired = await generateChatText(cfg, repairMessages, callOpts);
    return finalize(parseModelPayload(repaired), cfg);
  }
}

function finalize(
  payload: ReturnType<typeof parseModelPayload>,
  cfg: AiRuntimeConfig,
): ResearchGenerationResult {
  return {
    content: payload.content,
    questions: payload.questions,
    summary: payload.summary,
    outline: payload.outline,
    tags: payload.tags,
    metadata: { provider: cfg.provider, model: cfg.model },
  };
}
