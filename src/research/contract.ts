// AI output contract for the Research Canvas: the strict JSON shape the model
// must return, plus tolerant parsing. Ported from WindSeed Curve's
// `core/ai/{schema,parse,followup}.ts` and trimmed to NanoBee's needs.
//
// Product invariant (Curve's "铁律 1"): every generation must carry exactly
// three follow-up questions. Fewer or more is an invalid response.

import { z } from "zod";
import type { ResearchOutlineItem } from "./types";

/** Every AI generation must offer exactly this many follow-up questions. */
export const FOLLOWUP_COUNT = 3;

/** Exactly three non-empty follow-up questions. */
export const followupQuestionsSchema = z
  .array(z.string().trim().min(1))
  .length(FOLLOWUP_COUNT);

/** 1–4 short topic tags (each ≤ 24 chars). */
const tagsSchema = z.array(z.string().trim().min(1).max(24)).max(4).optional();

/** Recursive outline item: title (+ optional brief / children / tags). */
export const outlineItemSchema: z.ZodType<ResearchOutlineItem> = z.lazy(() =>
  z.object({
    title: z.string().trim().min(1),
    brief: z.string().trim().min(1).optional(),
    children: z.array(outlineItemSchema).max(8).optional(),
    tags: tagsSchema,
  }),
);

/** The raw JSON payload the model returns (before we attach metadata). */
export const modelPayloadSchema = z.object({
  content: z.string().trim(),
  questions: followupQuestionsSchema,
  summary: z.string().trim().min(1).max(240).optional(),
  outline: z.array(outlineItemSchema).max(12).optional(),
  tags: tagsSchema,
});

export type ModelPayload = z.infer<typeof modelPayloadSchema>;

/** Recursively drop non-object outline items the model may have emitted. */
function sanitizeOutline(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null && !Array.isArray(item),
    )
    .map((item) =>
      Array.isArray(item.children)
        ? { ...item, children: sanitizeOutline(item.children) }
        : item,
    );
}

/**
 * Merge the model's mirrored `outlineBriefs` tree (title + brief, same order)
 * into `outline` by position, then strip it. Curve splits the outline into a
 * title tree (streams first) and a brief tree (streams second); we only keep
 * the merged result. Pairing is by index so a reworded title never drops a
 * brief.
 */
function mergeBriefs(outline: unknown[], briefs: unknown[]): unknown[] {
  return outline.map((item, i) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const node = item as Record<string, unknown>;
    const brief = briefs[i];
    const next: Record<string, unknown> = { ...node };
    if (brief && typeof brief === "object" && !Array.isArray(brief)) {
      const b = brief as Record<string, unknown>;
      if (
        typeof b.brief === "string" &&
        b.brief.trim() &&
        (typeof node.brief !== "string" || !node.brief.trim())
      ) {
        next.brief = b.brief.trim();
      }
      if (Array.isArray(node.children)) {
        next.children = mergeBriefs(
          node.children,
          Array.isArray(b.children) ? b.children : [],
        );
      }
    }
    return next;
  });
}

/** Normalize a raw object before zod validation. */
function sanitizePayload(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }
  const record = { ...(value as Record<string, unknown>) };
  if (Array.isArray(record.outline) && Array.isArray(record.outlineBriefs)) {
    record.outline = mergeBriefs(record.outline, record.outlineBriefs);
  }
  delete record.outlineBriefs;
  if ("outline" in record) record.outline = sanitizeOutline(record.outline);
  return record;
}

/**
 * Scan `text` for every balanced, top-level `{...}` JSON object and return the
 * ones that parse. String-aware (braces inside string values don't miscount)
 * and prose-tolerant (text outside objects is skipped), so it recovers JSON
 * from replies wrapped in commentary or split across several objects.
 */
function extractJsonObjects(text: string): Record<string, unknown>[] {
  const objects: Record<string, unknown>[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}" && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          const parsed = JSON.parse(text.slice(start, i + 1));
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            objects.push(parsed as Record<string, unknown>);
          }
        } catch {
          // A balanced but non-JSON `{...}` run (e.g. prose braces) — skip it.
        }
        start = -1;
      }
    }
  }
  return objects;
}

/** The "richest" value among a key's fragments: the longest array, else the
 *  first non-empty string (falling back to ""), else the first defined value. */
function pickValue(values: unknown[]): unknown {
  const arrays = values.filter(Array.isArray) as unknown[][];
  if (arrays.length) return arrays.reduce((a, b) => (b.length > a.length ? b : a));
  const strings = values.filter((v) => typeof v === "string") as string[];
  if (strings.length) return strings.find((s) => s.trim() !== "") ?? strings[0];
  return values.find((v) => v !== undefined && v !== null) ?? values[0];
}

/**
 * Merge several JSON fragments into one payload by taking the richest value per
 * key. Some models (notably mandatory-reasoning ones like Gemini 3.5 Flash)
 * split one logical reply across concatenated top-level objects — e.g. the main
 * `{outline,...,questions}` followed by a separate `{"tags":[...]}`, or
 * `questions`/`tags` peeled off into a trailing object. Picking the richest
 * value per key reassembles them regardless of how the split fell.
 */
function mergeJsonObjects(objects: Record<string, unknown>[]): Record<string, unknown> {
  const keys = new Set<string>();
  for (const obj of objects) for (const key of Object.keys(obj)) keys.add(key);
  const merged: Record<string, unknown> = {};
  for (const key of keys) {
    merged[key] = pickValue(objects.filter((o) => key in o).map((o) => o[key]));
  }
  return merged;
}

/**
 * Parse the model's raw text into a validated payload. Fast path: a single bare
 * JSON object. Otherwise it extracts every balanced top-level object (skipping
 * surrounding prose) and merges them, so a prose-wrapped reply OR one split
 * across several concatenated objects still yields one complete payload. Throws
 * if no JSON is found or the contract (incl. exactly three questions) is violated.
 */
export function parseModelPayload(rawContent: string): ModelPayload {
  const trimmed = rawContent.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const objects = extractJsonObjects(trimmed);
    if (objects.length === 0) throw new Error("AI provider did not return JSON content");
    parsed = objects.length === 1 ? objects[0] : mergeJsonObjects(objects);
  }
  return modelPayloadSchema.parse(sanitizePayload(parsed));
}
