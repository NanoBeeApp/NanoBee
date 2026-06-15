// Worker-side zod schema for the FeedQuery DSL. Lives here (not in the shared
// src/artifacts/feed-query.ts) so zod is only bundled into the worker, keeping
// the client bundle lean. The create_data_view tool validates the model's
// arguments against this; on failure it throws and the model retries — the
// free-text title/topic are never executed as a query.

import { z } from "zod";
import type { FeedQuery } from "../../artifacts/feed-query";

// Title guard: no angle brackets / quotes / brackets / newlines, so a model-set
// title cannot break out into a prompt or markup boundary downstream.
const titleSchema = z
  .string()
  .min(1)
  .max(60)
  .refine((s) => !/[<>"「」\n]/.test(s), "title contains forbidden characters");

export const feedQuerySchema = z.object({
  source: z.string().min(1).max(64),
  filter: z.object({
    topic: z.string().min(1).max(200),
    keywords: z.array(z.string().max(60)).max(10).optional(),
    minPoints: z.number().int().nonnegative().optional(),
    timeRange: z
      .object({ unit: z.enum(["h", "d"]), value: z.number().int().positive().max(365) })
      .optional(),
    sourceParams: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
      .optional(),
  }),
  sort: z.enum(["relevance", "recency", "points", "default"]).default("default"),
  defaultView: z.enum(["list", "card", "table", "timeline"]).default("card"),
  title: titleSchema,
});

/** Parse + validate raw tool args into a FeedQuery, throwing a model-readable
 *  error on failure. `allowedSources` constrains `source` to live hub ids. */
export function parseFeedQuery(
  args: Record<string, unknown>,
  allowedSources: string[],
): FeedQuery {
  const parsed = feedQuerySchema.parse(args);
  if (allowedSources.length && !allowedSources.includes(parsed.source)) {
    throw new Error(
      `Unknown data source "${parsed.source}". Available sources: ${allowedSources.join(", ")}.`,
    );
  }
  return parsed as FeedQuery;
}
