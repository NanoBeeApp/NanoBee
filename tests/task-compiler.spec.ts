/**
 * Unit tests for the task compiler's pure helper functions.
 * These tests validate the JSON parsing, schema repair, and condition
 * evaluation logic without any LLM or server dependency.
 *
 * To run: pnpm test (or vitest run)
 */

import { describe, expect, it } from "vitest";

// We test the public engine functions which are already exported:
import {
  extractMetric,
  evaluateCondition,
  renderTemplate,
  computeNextRunAt,
} from "../src/worker/scheduler/engine";
import type { ScheduleTrigger } from "../src/types";

// ---------------------------------------------------------------------------
// extractMetric
// ---------------------------------------------------------------------------

describe("extractMetric", () => {
  const result = {
    summary: "test",
    items: [
      { price: 3250.5, title: "Gold" },
      { price: 3100, title: "Silver" },
    ],
  };

  it("extracts __count__ as items.length", () => {
    expect(extractMetric(result, "__count__")).toBe(2);
  });

  it("extracts a dot-path value", () => {
    expect(extractMetric(result, "items[0].price")).toBe(3250.5);
  });

  it("extracts a nested index", () => {
    expect(extractMetric(result, "items[1].price")).toBe(3100);
  });

  it("returns null for a missing path", () => {
    expect(extractMetric(result, "items[0].missing")).toBeNull();
  });

  it("returns null for a non-numeric value", () => {
    expect(extractMetric(result, "items[0].title")).toBeNull();
  });

  it("coerces a numeric string", () => {
    const r = { summary: "", items: [{ price: "3300.0" }] };
    expect(extractMetric(r, "items[0].price")).toBe(3300.0);
  });
});

// ---------------------------------------------------------------------------
// evaluateCondition
// ---------------------------------------------------------------------------

describe("evaluateCondition", () => {
  it("gt fires when value > threshold", () => {
    expect(evaluateCondition(3300, "gt", 3000, null)).toBe(true);
  });

  it("gt does not fire when value <= threshold", () => {
    expect(evaluateCondition(3000, "gt", 3000, null)).toBe(false);
  });

  it("lt fires when value < threshold", () => {
    expect(evaluateCondition(2900, "lt", 3000, null)).toBe(true);
  });

  it("lte fires when value == threshold", () => {
    expect(evaluateCondition(3000, "lte", 3000, null)).toBe(true);
  });

  it("gte fires when value > threshold", () => {
    expect(evaluateCondition(3001, "gte", 3000, null)).toBe(true);
  });

  it("changed fires on first run (previousValue null)", () => {
    expect(evaluateCondition(3300, "changed", undefined, null)).toBe(true);
  });

  it("changed fires when value differs from previous", () => {
    expect(evaluateCondition(3300, "changed", undefined, 3200)).toBe(true);
  });

  it("changed does not fire when value equals previous", () => {
    expect(evaluateCondition(3300, "changed", undefined, 3300)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// renderTemplate
// ---------------------------------------------------------------------------

describe("renderTemplate", () => {
  it("substitutes all named variables", () => {
    const tmpl = "Gold is now {{value}} USD/oz, alert was {{threshold}}.";
    const out = renderTemplate(tmpl, { value: "3300", threshold: "3000" });
    expect(out).toBe("Gold is now 3300 USD/oz, alert was 3000.");
  });

  it("replaces unknown variables with empty string", () => {
    const out = renderTemplate("{{missing}}", { value: "x" });
    expect(out).toBe("");
  });
});

// ---------------------------------------------------------------------------
// computeNextRunAt
// ---------------------------------------------------------------------------

describe("computeNextRunAt", () => {
  const spec: ScheduleTrigger = {
    kind: "schedule",
    hour: 8,
    minute: 0,
    label: "Daily at 08:00 UTC",
  };

  it("returns a time strictly after the reference unix timestamp", () => {
    const after = Math.floor(Date.now() / 1000);
    const next = computeNextRunAt(spec, after);
    expect(next).toBeGreaterThan(after);
  });

  it("next is at the correct hour and minute (UTC)", () => {
    const after = Math.floor(Date.now() / 1000);
    const next = computeNextRunAt(spec, after);
    const d = new Date(next * 1000);
    expect(d.getUTCHours()).toBe(8);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
  });

  it("advances to the next day when today's fire time has passed", () => {
    // Construct a reference time that is just after 08:00 UTC today.
    const now = new Date();
    now.setUTCHours(9, 0, 0, 0); // 09:00 UTC = past the 08:00 slot
    const after = Math.floor(now.getTime() / 1000);
    const next = computeNextRunAt(spec, after);
    const nextDate = new Date(next * 1000);
    // next must be at least 23 hours away
    expect(next - after).toBeGreaterThanOrEqual(23 * 3600 - 1);
    expect(nextDate.getUTCHours()).toBe(8);
  });
});
