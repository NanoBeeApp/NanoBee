// FeedQuery DSL — the structured query a chat message is parsed into when the
// user asks for a "data view" (e.g. "a Hacker News filtered to AI posts").
//
// This is the closed contract between the chat agent (which fills it in via the
// create_data_view tool) and the data pipeline (which fetches + renders it).
// Pure platform-agnostic types only; the zod validation schema lives worker-side
// (worker/data-views/feed-query-schema.ts) so the client bundle stays lean.
//
// Public-repo language rule: code/comments English; product data may be Chinese.

/** A data-hub source id. Constrained at runtime to the hub's registered ids. */
export type FeedSourceId = string;

/** The rendering modes a data view supports; mirrors the URL `vm` param. */
export type DataViewMode = "list" | "card" | "table" | "timeline";

/** How items are ordered. `default` defers to the source's natural order. */
export type FeedSort = "relevance" | "recency" | "points" | "default";

/** The filter口径 the user described, plus passthrough source params. */
export interface FeedFilter {
  /** Free-text topic the view is about, e.g. "AI / 大模型". Drives filtering. */
  topic: string;
  /** Optional coarse keywords to help narrowing (source-dependent). */
  keywords?: string[];
  /** Optional minimum score/points (client-side filter for sources like HN). */
  minPoints?: number;
  /** Optional recency window. */
  timeRange?: { unit: "h" | "d"; value: number };
  /** Params passed straight through to the data-hub source fetch call. */
  sourceParams?: Record<string, string | number | boolean>;
}

/** The full structured query backing one data view. */
export interface FeedQuery {
  /** The data-hub source id, e.g. "hackernews" | "news" | "websearch". */
  source: FeedSourceId;
  filter: FeedFilter;
  sort: FeedSort;
  defaultView: DataViewMode;
  /** Display title, e.g. "Hacker News · AI 相关帖子". */
  title: string;
}
