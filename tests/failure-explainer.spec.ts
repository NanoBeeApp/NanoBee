/**
 * Unit tests for the task run failure-explainer helper.
 *
 * The explainer maps raw error messages to human-readable explanations
 * without any LLM or server dependency. Tests verify each rule category
 * fires on the right patterns and the fallback works for unknown errors.
 *
 * To run: pnpm test (or: vitest run tests/failure-explainer.spec.ts)
 */

import { describe, expect, it } from "vitest";
import {
  explainFailure,
  formatErrorText,
} from "../src/worker/task-runs/failure-explainer";

// ---------------------------------------------------------------------------
// explainFailure — category matching
// ---------------------------------------------------------------------------

describe("explainFailure — category matching", () => {
  it("classifies ENOTFOUND as network", () => {
    const { category } = explainFailure(new Error("getaddrinfo ENOTFOUND api.example.com"));
    expect(category).toBe("network");
  });

  it("classifies ECONNREFUSED as network", () => {
    const { category } = explainFailure("connect ECONNREFUSED 127.0.0.1:3344");
    expect(category).toBe("network");
  });

  it("classifies 'fetch failed' as network", () => {
    const { category } = explainFailure(new Error("fetch failed"));
    expect(category).toBe("network");
  });

  it("classifies timeout error as timeout", () => {
    const { category } = explainFailure(new Error("Request timed out after 20000ms"));
    expect(category).toBe("timeout");
  });

  it("classifies ETIMEDOUT as timeout", () => {
    const { category } = explainFailure("connect ETIMEDOUT");
    expect(category).toBe("timeout");
  });

  it("classifies socket hang up as timeout", () => {
    const { category } = explainFailure("socket hang up");
    expect(category).toBe("timeout");
  });

  it("classifies DATA_HUB_URL missing as source_unavailable", () => {
    const { category } = explainFailure("DATA_HUB_URL not configured");
    expect(category).toBe("source_unavailable");
  });

  it("classifies unknown source id as source_unavailable", () => {
    const { category } = explainFailure("unknown source: foobar");
    expect(category).toBe("source_unavailable");
  });

  it("classifies metric path error as metric_not_found", () => {
    const { category } = explainFailure("could not extract metric path: items[0].price");
    expect(category).toBe("metric_not_found");
  });

  it("classifies 'no value at' as metric_not_found", () => {
    const { category } = explainFailure("no value at path: data.gold.price");
    expect(category).toBe("metric_not_found");
  });

  it("classifies missing API key as auth", () => {
    const { category } = explainFailure("No AI API key available — configure one in Settings.");
    expect(category).toBe("auth");
  });

  it("classifies 401 as auth", () => {
    const { category } = explainFailure("HTTP 401 Unauthorized");
    expect(category).toBe("auth");
  });

  it("classifies 429 as rate_limit", () => {
    const { category } = explainFailure("HTTP 429 Too Many Requests");
    expect(category).toBe("rate_limit");
  });

  it("classifies quota exceeded as rate_limit", () => {
    const { category } = explainFailure("quota exceeded for key");
    expect(category).toBe("rate_limit");
  });

  it("classifies invalid trigger_spec as config", () => {
    const { category } = explainFailure("invalid trigger_spec JSON");
    expect(category).toBe("config");
  });

  it("classifies unknown errors as unknown", () => {
    const { category } = explainFailure("something completely unexpected happened here");
    expect(category).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// explainFailure — context injection
// ---------------------------------------------------------------------------

describe("explainFailure — context injection", () => {
  it("includes sourceId in network explanation", () => {
    const { explanation } = explainFailure("fetch failed", { sourceId: "gold" });
    expect(explanation).toContain("gold");
  });

  it("includes metric in metric_not_found explanation", () => {
    const { explanation } = explainFailure("could not extract metric from source", {
      metric: "items[0].price",
    });
    expect(explanation).toContain("items[0].price");
  });

  it("includes retry count in unknown fallback", () => {
    const { explanation } = explainFailure("completely unknown catastrophe", {
      retryCount: 2,
    });
    expect(explanation).toContain("2");
  });

  it("returns non-empty fix for every built-in category", () => {
    const errors = [
      "ENOTFOUND host",
      "timed out",
      "DATA_HUB_URL",
      "could not extract metric",
      "api key missing",
      "429 rate limit",
      "invalid trigger_spec",
    ];
    for (const err of errors) {
      const { fix } = explainFailure(err);
      expect(fix.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// formatErrorText
// ---------------------------------------------------------------------------

describe("formatErrorText", () => {
  it("returns a non-empty string for any error", () => {
    const text = formatErrorText(new Error("test"));
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });

  it("truncates to at most 1000 chars", () => {
    const longErr = "a".repeat(2000);
    const text = formatErrorText(longErr);
    expect(text.length).toBeLessThanOrEqual(1000);
  });

  it("combines explanation and fix in one string", () => {
    const text = formatErrorText("fetch failed", { sourceId: "websearch" });
    // Should contain both a sentence about the source and a suggested action.
    expect(text).toMatch(/websearch/i);
    expect(text.length).toBeGreaterThan(30);
  });

  it("handles non-Error objects gracefully", () => {
    // Should not throw for arbitrary inputs.
    expect(() => formatErrorText({ code: 500, msg: "oops" })).not.toThrow();
    expect(() => formatErrorText(null)).not.toThrow();
    expect(() => formatErrorText(undefined)).not.toThrow();
    expect(() => formatErrorText(42)).not.toThrow();
  });
});
