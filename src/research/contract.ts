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
 * Parse the model's raw text into a validated payload. Accepts a bare JSON
 * object or one embedded in surrounding prose (first `{...}` match). Throws if
 * no JSON is found or the contract (incl. exactly three questions) is violated.
 */
export function parseModelPayload(rawContent: string): ModelPayload {
  const trimmed = rawContent.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI provider did not return JSON content");
    parsed = JSON.parse(match[0]);
  }
  return modelPayloadSchema.parse(sanitizePayload(parsed));
}
