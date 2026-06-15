/**
 * AI-powered column detection for the batch task engine.
 *
 * Given the first N rows of a parsed file, calls the LLM (via the same
 * generateAgentTurn + resolveAiConfig pipeline used by the task compiler) to:
 *  1. Identify which column contains the primary per-row INPUT (e.g. company
 *     name, URL, keyword).
 *  2. Propose a one-line action description that will be applied to every row.
 *
 * The result is returned as a structured `BatchDetection` value that the
 * preview endpoint sends to the UI for user confirmation before batch creation.
 *
 * Design constraints:
 *  - Tolerant JSON parsing + Zod validation (same pattern as task-compiler.ts).
 *  - Returns a safe default when the LLM call fails (column 0 + generic action).
 *  - Never calls this at module/top-level scope.
 */

import { z } from "zod";
import { generateAgentTurn } from "../ai/client";
import type { AiRuntimeConfig } from "../ai/settings";
import type { ParseResult } from "./file-parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** What the detection step returns for the UI to confirm. */
export interface BatchDetection {
  /** 0-based index of the column the AI selected as the primary input. */
  inputColumnIndex: number;
  /** The header label for the selected column. */
  inputColumnName: string;
  /** One-line description of what will be done for each row. */
  suggestedAction: string;
  /** Whether this came from an actual LLM call (false = safe fallback). */
  fromAi: boolean;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const detectionSchema = z.object({
  inputColumnIndex: z.number().int().min(0),
  inputColumnName: z.string().min(1).max(200),
  suggestedAction: z.string().min(1).max(500),
});

type DetectionRaw = z.infer<typeof detectionSchema>;

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildPrompt(parsed: ParseResult, previewRows: string[][]): string {
  const headerLine = parsed.headers.join(" | ");
  const sampleLines = previewRows
    .slice(0, 5)
    .map((r) => r.join(" | "))
    .join("\n");

  return `You are analyzing a file uploaded for batch processing. The file has ${parsed.rows.length} data rows.

Headers: ${headerLine}
First rows (pipe-separated):
${sampleLines}

Your job:
1. Identify which column (0-based index) contains the PRIMARY per-row input — the item each row is "about" (e.g. a company name, a URL, a search keyword, a person's name).
2. Write a SHORT one-line action (≤ 80 chars) describing what should be done for EACH row using that input (e.g. "Search for the latest funding news for each company", "Summarize the webpage at each URL", "Look up recent news about each keyword").

Reply with ONLY a JSON object — no prose, no markdown fences:

{
  "inputColumnIndex": number,
  "inputColumnName": string,
  "suggestedAction": string
}`;
}

// ---------------------------------------------------------------------------
// Parse + repair
// ---------------------------------------------------------------------------

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

function repairDetection(value: unknown, colCount: number): unknown {
  if (typeof value !== "object" || value === null) return value;
  const rec = { ...(value as Record<string, unknown>) };
  // Clamp column index to valid range.
  if (typeof rec.inputColumnIndex !== "number" || rec.inputColumnIndex < 0) {
    rec.inputColumnIndex = 0;
  }
  // rec.inputColumnIndex was narrowed to number in the guard above; cast to satisfy Math.min.
  rec.inputColumnIndex = Math.min(
    Math.round(rec.inputColumnIndex as number),
    Math.max(0, colCount - 1),
  );
  return rec;
}

// ---------------------------------------------------------------------------
// Safe fallback
// ---------------------------------------------------------------------------

/** Fallback used when the LLM call fails or produces unusable output. */
function safeFallback(parsed: ParseResult): BatchDetection {
  return {
    inputColumnIndex: 0,
    inputColumnName: parsed.headers[0] ?? "Column 1",
    suggestedAction: "Process each row",
    fromAi: false,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect the input column + proposed action using the LLM.
 *
 * Returns a `BatchDetection` value. On any failure (no API key, LLM error,
 * JSON parsing failure) returns a safe fallback rather than throwing, so the
 * preview endpoint always has something useful to return.
 *
 * MUST only be called inside a request/handler/function scope.
 */
export async function detectColumns(
  cfg: AiRuntimeConfig,
  parsed: ParseResult,
): Promise<BatchDetection> {
  if (!cfg.apiKey || parsed.headers.length === 0) {
    return safeFallback(parsed);
  }

  // Build preview rows from the first 5 data rows.
  const previewRows = parsed.rows.slice(0, 5).map((r) => r.fields);
  const prompt = buildPrompt(parsed, previewRows);

  let raw: string;
  try {
    const turn = await generateAgentTurn(
      cfg,
      [
        { role: "system", content: "You are a data analysis assistant. Respond with JSON only." },
        { role: "user", content: prompt },
      ],
      [], // no tools — pure structured output
      { maxTokens: 512, timeoutMs: 12_000 },
    );
    raw = turn.text?.trim() ?? "";
  } catch (err) {
    console.warn("[batch/detect-columns] LLM call failed:", String(err));
    return safeFallback(parsed);
  }

  if (!raw) return safeFallback(parsed);

  let parsed2: unknown;
  try {
    parsed2 = extractJson(raw);
  } catch (err) {
    console.warn("[batch/detect-columns] JSON extraction failed:", String(err));
    return safeFallback(parsed);
  }

  let result: DetectionRaw;
  try {
    result = detectionSchema.parse(repairDetection(parsed2, parsed.headers.length));
  } catch (err) {
    console.warn("[batch/detect-columns] schema validation failed:", String(err));
    return safeFallback(parsed);
  }

  // Ensure the column name reflects the actual headers array.
  const resolvedName =
    parsed.headers[result.inputColumnIndex] ?? result.inputColumnName;

  return {
    inputColumnIndex: result.inputColumnIndex,
    inputColumnName: resolvedName,
    suggestedAction: result.suggestedAction,
    fromAi: true,
  };
}
