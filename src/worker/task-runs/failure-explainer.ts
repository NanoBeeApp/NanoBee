/**
 * Plain-language failure explainer for task runs.
 *
 * Maps raw error messages (network, source unreachable, metric not found,
 * timeout, config issues…) to a short human explanation + a suggested fix.
 *
 * Rules-based only — no LLM needed. This is intentional: LLM calls in an
 * error path risk compounding the failure. The output is stored in
 * task_runs.error_text so users never see raw stack traces.
 *
 * Usage:
 *   const { explanation, fix } = explainFailure(rawError, { sourceId, metric });
 *   const text = `${explanation} ${fix}`.trim();
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FailureContext {
  /** Data-hub source id that was invoked, if any (e.g. "gold", "websearch"). */
  sourceId?: string;
  /** Metric path that was extracted, if any (e.g. "items[0].price"). */
  metric?: string;
  /** Number of retries that were attempted before giving up. */
  retryCount?: number;
  /** The task kind: "schedule" | "condition" | "batch". */
  taskKind?: string;
}

export interface FailureExplanation {
  /** Short human-readable sentence describing what went wrong (≤ 160 chars). */
  explanation: string;
  /** Actionable suggestion for the user (≤ 120 chars). */
  fix: string;
  /**
   * Machine-readable category for grouping / analytics.
   * network | timeout | source_unavailable | metric_not_found |
   * config | auth | rate_limit | unknown
   */
  category:
    | "network"
    | "timeout"
    | "source_unavailable"
    | "metric_not_found"
    | "config"
    | "auth"
    | "rate_limit"
    | "unknown";
}

// ---------------------------------------------------------------------------
// Pattern rules (evaluated in order; first match wins)
// ---------------------------------------------------------------------------

interface Rule {
  patterns: Array<string | RegExp>;
  category: FailureExplanation["category"];
  explanation: string | ((ctx: FailureContext) => string);
  fix: string | ((ctx: FailureContext) => string);
}

const RULES: Rule[] = [
  // --- Timeout ------------------------------------------------------------------
  {
    patterns: ["timed out", "timeout", "etimedout", "econnreset", "socket hang up"],
    category: "timeout",
    explanation: (ctx) =>
      ctx.sourceId
        ? `The "${ctx.sourceId}" data source took too long to respond and the request was cancelled.`
        : "A request timed out while fetching external data.",
    fix: "This is usually a temporary blip. The task will retry on the next scheduled cycle.",
  },

  // --- DNS / network down -------------------------------------------------------
  {
    patterns: [
      "enotfound",
      "econnrefused",
      "network error",
      "failed to fetch",
      "fetch failed",
      "no such host",
      /getaddrinfo/i,
    ],
    category: "network",
    explanation: (ctx) =>
      ctx.sourceId
        ? `Could not reach the "${ctx.sourceId}" data source — the network appears to be unreachable.`
        : "Could not reach an external service — the network appears to be down.",
    fix: "Check your internet connection or the data-hub service status. The task will retry automatically.",
  },

  // --- Data hub / source unavailable -------------------------------------------
  {
    patterns: [
      "data hub",
      "data-hub",
      "DATA_HUB_URL",
      "source not found",
      "unknown source",
      "404",
      "no source registered",
    ],
    category: "source_unavailable",
    explanation: (ctx) =>
      ctx.sourceId
        ? `The data source "${ctx.sourceId}" is not available or not yet registered in the data hub.`
        : "The data hub service is not configured or is unreachable.",
    fix: "Ensure the data-hub service is running and the source id is correct in the task trigger.",
  },

  // --- Metric / path not found --------------------------------------------------
  {
    patterns: [
      "metric",
      "could not extract",
      "path not found",
      "null result",
      "no value at",
    ],
    category: "metric_not_found",
    explanation: (ctx) =>
      ctx.metric
        ? `The metric path "${ctx.metric}" was not found in the data returned by the source.`
        : "The expected metric was not found in the data source response.",
    fix: "Check that the metric path in the task trigger matches the data shape returned by the source.",
  },

  // --- Auth / API key -----------------------------------------------------------
  {
    patterns: [
      "api key",
      "apikey",
      "unauthorized",
      "403",
      "401",
      "invalid key",
      "no ai api key",
      "configure one in settings",
    ],
    category: "auth",
    explanation: "An API key is missing or invalid.",
    fix: "Go to Settings → AI to add your API key, or ask your administrator to configure the built-in key.",
  },

  // --- Rate limit ---------------------------------------------------------------
  {
    patterns: ["rate limit", "too many requests", "429", "quota exceeded", "quota"],
    category: "rate_limit",
    explanation: (ctx) =>
      ctx.sourceId
        ? `The "${ctx.sourceId}" source returned a rate-limit error.`
        : "A rate limit was hit on an external API.",
    fix: "Increase the task cooldown interval or upgrade your API plan.",
  },

  // --- Config / setup issues ----------------------------------------------------
  {
    patterns: [
      "trigger_spec",
      "invalid json",
      "parse error",
      "schema",
      "invalid trigger",
      "missing required",
    ],
    category: "config",
    explanation: "The task configuration is invalid or could not be parsed.",
    fix: "Delete and recreate the task with a valid trigger spec.",
  },
];

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

/**
 * Map a raw error (Error object or string) to a FailureExplanation.
 * Matches rules in order; returns a generic "unknown" explanation on no match.
 * Never throws.
 */
export function explainFailure(
  err: unknown,
  ctx: FailureContext = {},
): FailureExplanation {
  const raw = toMessage(err).toLowerCase();

  for (const rule of RULES) {
    if (matches(raw, rule.patterns)) {
      return {
        category: rule.category,
        explanation: resolve(rule.explanation, ctx),
        fix: resolve(rule.fix, ctx),
      };
    }
  }

  // No rule matched — return a generic but still human-friendly explanation.
  const retryNote =
    ctx.retryCount !== undefined && ctx.retryCount > 0
      ? ` (retried ${ctx.retryCount} time${ctx.retryCount === 1 ? "" : "s"})`
      : "";

  return {
    category: "unknown",
    explanation: `An unexpected error occurred while running the task${retryNote}.`,
    fix: "Check the system logs for details. If this keeps happening, contact support.",
  };
}

/**
 * Convenience: format explanation + fix into a single string suitable for
 * storage in task_runs.error_text (max 1000 chars).
 */
export function formatErrorText(err: unknown, ctx: FailureContext = {}): string {
  const { explanation, fix } = explainFailure(err, ctx);
  return `${explanation} ${fix}`.trim().slice(0, 1000);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err === null || err === undefined) return String(err);
  try {
    const s = JSON.stringify(err);
    return s !== undefined ? s : String(err);
  } catch {
    return String(err);
  }
}

function matches(haystack: string, patterns: Array<string | RegExp>): boolean {
  return patterns.some((p) =>
    typeof p === "string" ? haystack.includes(p.toLowerCase()) : p.test(haystack),
  );
}

function resolve(
  value: string | ((ctx: FailureContext) => string),
  ctx: FailureContext,
): string {
  return typeof value === "function" ? value(ctx) : value;
}
