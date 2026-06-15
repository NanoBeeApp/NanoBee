/**
 * NL → TriggerSpec compiler: server-side module that detects task/monitoring
 * intent in a user's chat message and extracts a candidate TriggerSpec plus
 * display metadata using a single structured-output LLM call.
 *
 * Design constraints:
 * - Uses the same resolveAiConfig / generateAgentTurn pipeline as the main
 *   chat, so it automatically respects the user's provider / key preferences.
 * - The output is tolerant: malformed JSON is repaired; missing optional fields
 *   get sensible defaults. Returns null when the message is not a task intent.
 * - Runs server-side only; the cron engine evaluates the resulting TriggerSpec
 *   with zero LLM calls and zero user API keys.
 * - Only the three data-hub sources that actually exist today are exposed to
 *   the model: hackernews, websearch, gold.
 */

import { z } from "zod";
import { generateAgentTurn } from "../ai/client";
import type { AiRuntimeConfig } from "../ai/settings";
import type { TriggerSpec, ScheduleTrigger, ConditionTrigger, ConditionOp } from "../../types";

// ---------------------------------------------------------------------------
// Output schema the model must fill in
// ---------------------------------------------------------------------------

/**
 * Candidate task suggestion produced by the compiler. Carries both the
 * structured TriggerSpec (consumed by the cron engine) and display metadata
 * shown in the confirmation card.
 */
export interface TaskSuggestionData {
  /** Concise task title, ≤ 40 chars. */
  title: string;
  /** Which topic bucket the task belongs to. */
  topic: string;
  /** Human-readable trigger label (e.g. "每天早上 08:00" / "黄金价格跌超 3%"). */
  triggerLabel: string;
  /** Notification message / template delivered when the trigger fires. */
  message: string;
  /** The structured trigger; null when the message was not a task intent. */
  triggerSpec: TriggerSpec | null;
}

// ---------------------------------------------------------------------------
// Zod schema for tolerant JSON parsing (mirrors TriggerSpec + extras)
// ---------------------------------------------------------------------------

const scheduleTriggerSchema = z.object({
  kind: z.literal("schedule"),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  label: z.string().min(1).max(120),
  message: z.string().max(500).optional(),
});

const conditionTriggerSchema = z.object({
  kind: z.literal("condition"),
  sourceId: z.enum(["hackernews", "websearch", "gold"]),
  metric: z.string().min(1).max(200),
  op: z.enum(["gt", "lt", "gte", "lte", "changed"] as [ConditionOp, ...ConditionOp[]]),
  threshold: z.number().optional(),
  cooldownSeconds: z.number().int().min(60).max(86400 * 7).default(3600),
  messageTemplate: z.string().min(1).max(500),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const compiledSchema = z.object({
  isTask: z.boolean(),
  title: z.string().min(1).max(60).optional(),
  topic: z.string().min(1).max(40).optional(),
  triggerLabel: z.string().min(1).max(120).optional(),
  message: z.string().min(1).max(500).optional(),
  triggerSpec: z
    .discriminatedUnion("kind", [scheduleTriggerSchema, conditionTriggerSchema])
    .optional()
    .nullable(),
});

type CompiledRaw = z.infer<typeof compiledSchema>;

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

/**
 * System prompt for the structured-output extraction call. Kept separate from
 * the chat system prompt so the two never interfere — this call uses a fresh
 * message array.
 */
const SYSTEM_PROMPT = `You are a task-intent extractor for NanoBee, a proactive monitoring assistant.

Your job: decide whether the user's message expresses a monitoring or scheduling intent, and if so extract a structured task specification.

Reply with ONLY a JSON object — no prose, no markdown fences — matching this shape exactly:

{
  "isTask": boolean,          // true = the message is a task/monitoring intent
  "title": string,            // concise task title ≤ 40 chars (Chinese ok)
  "topic": string,            // topic bucket: "gold" | "news" | "health" | "edu" | "brief" | "tech"
  "triggerLabel": string,     // human label shown on the card, e.g. "每天早上 08:00" or "黄金价格跌超 3%"
  "message": string,          // notification text delivered when the task fires
  "triggerSpec": { ... } | null  // structured spec (see below), or null when isTask=false
}

TriggerSpec shapes:

SCHEDULE — fires at a fixed daily time:
{
  "kind": "schedule",
  "hour": number,     // UTC hour 0-23 (convert from user's local time; assume UTC+8 if unspecified)
  "minute": number,   // UTC minute 0-59
  "label": string,    // human label, e.g. "Daily at 08:00 (UTC+8)"
  "message": string   // optional fixed message to write to the feed
}

CONDITION — polls a data source, fires when a numeric condition is met:
{
  "kind": "condition",
  "sourceId": "gold" | "hackernews" | "websearch",
  "metric": string,           // dot-path into DataSourceResult, e.g. "items[0].price" or "__count__"
  "op": "gt" | "lt" | "gte" | "lte" | "changed",
  "threshold": number,        // required for gt/lt/gte/lte
  "cooldownSeconds": number,  // min seconds between firings, default 3600
  "messageTemplate": string,  // Mustache: {{value}} {{threshold}} {{source}} {{title}}
  "params": {}                // optional source params (e.g. {"query": "gold price"})
}

Available data-hub sources:
- "gold" — gold spot price; metric "items[0].xauUsdPerOz" gives the USD/oz price
- "hackernews" — top HN stories; metric "__count__" gives item count
- "websearch" — web search; requires params.query; metric "__count__" gives result count

Rules:
1. If the user is NOT expressing a monitoring/scheduling intent (normal question, chat, etc.), set isTask=false and leave triggerSpec null.
2. For time-based reminders/reports ("每天早上8点" / "daily at 9am"): use kind=schedule.
3. For threshold/condition alerts ("黄金跌超3%", "gold drops below 2000"): use kind=condition with the closest matching source.
4. Convert local times to UTC assuming UTC+8 unless the user specifies otherwise.
5. For gold price changes expressed as percentages (e.g. "跌超3%"), derive a reasonable absolute threshold from a typical gold price (~3300 USD/oz) and use op=lt for drops, op=gt for rises.
6. When unsure about the source or metric, prefer "websearch" with an appropriate query param.
7. Keep title and message in the same language as the user's message.`;

// ---------------------------------------------------------------------------
// Parse + repair
// ---------------------------------------------------------------------------

/** Extract the first JSON object from the model's raw output. */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no JSON in model output");
    return JSON.parse(match[0]);
  }
}

/** Repair obvious model mistakes before schema validation. */
function repairRaw(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const rec = { ...(value as Record<string, unknown>) };

  // Ensure boolean isTask
  if (typeof rec.isTask !== "boolean") {
    rec.isTask = Boolean(rec.isTask);
  }

  // If triggerSpec is present, repair it too
  if (rec.triggerSpec && typeof rec.triggerSpec === "object") {
    const spec = rec.triggerSpec as Record<string, unknown>;
    // Clamp schedule times
    if (spec.kind === "schedule") {
      spec.hour = Math.max(0, Math.min(23, Math.round(Number(spec.hour) || 0)));
      spec.minute = Math.max(0, Math.min(59, Math.round(Number(spec.minute) || 0)));
    }
    // Clamp condition cooldown
    if (spec.kind === "condition") {
      const cd = Number(spec.cooldownSeconds);
      spec.cooldownSeconds = !isNaN(cd) ? Math.max(60, Math.min(86400 * 7, cd)) : 3600;
    }
  }
  return rec;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compile a user message into a TaskSuggestionData (or null when the message
 * is not a task intent). Runs one LLM call using the provided AiRuntimeConfig.
 *
 * Returns null when:
 * - the message is a normal chat message (not a task intent)
 * - the model call fails (non-fatal — chat continues without a card)
 * - the model output cannot be parsed into a valid TriggerSpec
 *
 * IMPORTANT: Only call this inside a request/handler scope. Never at module
 * top-level (Workers deploy validation forbids top-level I/O).
 */
export async function compileTaskIntent(
  cfg: AiRuntimeConfig,
  userMessage: string,
): Promise<TaskSuggestionData | null> {
  if (!cfg.apiKey) {
    // No key configured — skip silently, chat continues normally.
    return null;
  }

  let raw: string;
  try {
    const turn = await generateAgentTurn(
      cfg,
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      [], // no tools — pure structured-output extraction
      // maxTokens must be generous: the JSON carries a nested triggerSpec plus
      // Chinese title/label/message text. 512 truncated the output mid-string,
      // producing invalid JSON and silently dropping every suggestion card.
      { maxTokens: 1536, timeoutMs: 15_000 },
    );
    raw = turn.text?.trim() ?? "";
  } catch (err) {
    console.warn("[task-compiler] LLM call failed:", String(err));
    return null;
  }

  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = extractJson(raw);
  } catch (err) {
    console.warn("[task-compiler] JSON extraction failed:", String(err), "| raw:", raw.slice(0, 200));
    return null;
  }

  let compiled: CompiledRaw;
  try {
    compiled = compiledSchema.parse(repairRaw(parsed));
  } catch (err) {
    console.warn("[task-compiler] schema validation failed:", String(err));
    return null;
  }

  if (!compiled.isTask) return null;
  if (!compiled.triggerSpec) return null;

  const spec = compiled.triggerSpec as TriggerSpec;

  // Build the fallback triggerLabel based on spec kind, outside the return object
  // so operator precedence is unambiguous.
  const fallbackLabel =
    spec.kind === "schedule"
      ? `每天 ${String((spec as ScheduleTrigger).hour).padStart(2, "0")}:${String((spec as ScheduleTrigger).minute).padStart(2, "0")} UTC`
      : (spec as ConditionTrigger).sourceId;

  return {
    title: compiled.title ?? "监控任务",
    topic: compiled.topic ?? "gold",
    triggerLabel: compiled.triggerLabel ?? fallbackLabel,
    message: compiled.message ?? "",
    triggerSpec: spec,
  };
}
