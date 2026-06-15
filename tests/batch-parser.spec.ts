/**
 * Unit tests for the batch file parser (src/worker/batch/file-parser.ts).
 * These tests are pure — no I/O, no server dependency.
 *
 * Run: pnpm test
 */

import { describe, expect, it } from "vitest";
import {
  detectFormat,
  parseFileText,
  rejectXlsx,
  getField,
} from "../src/worker/batch/file-parser";

// ---------------------------------------------------------------------------
// detectFormat
// ---------------------------------------------------------------------------

describe("detectFormat", () => {
  it("detects csv by filename extension", () => {
    expect(detectFormat("a,b\n1,2", "data.csv")).toBe("csv");
  });

  it("detects tsv by filename extension", () => {
    expect(detectFormat("a\tb\n1\t2", "data.tsv")).toBe("tsv");
  });

  it("detects txt by filename extension", () => {
    expect(detectFormat("hello\nworld", "data.txt")).toBe("txt");
  });

  it("sniffs csv from tab-less comma content when no filename", () => {
    expect(detectFormat("name,age\nAlice,30")).toBe("csv");
  });

  it("sniffs tsv when first line has a tab", () => {
    expect(detectFormat("name\tage\nAlice\t30")).toBe("tsv");
  });

  it("falls back to txt when neither tab nor comma is present", () => {
    expect(detectFormat("Apple\nBanana\nCherry")).toBe("txt");
  });
});

// ---------------------------------------------------------------------------
// parseFileText — TXT
// ---------------------------------------------------------------------------

describe("parseFileText (txt)", () => {
  it("parses single-column txt with one entry per line", () => {
    const result = parseFileText("Apple\nBanana\nCherry", "items.txt");
    expect(result.format).toBe("txt");
    expect(result.headers).toEqual(["Value"]);
    expect(result.hasHeader).toBe(false);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].fields).toEqual(["Apple"]);
    expect(result.rows[2].fields).toEqual(["Cherry"]);
  });

  it("skips blank lines in txt", () => {
    const result = parseFileText("Apple\n\nBanana\n  \nCherry", "items.txt");
    expect(result.rows).toHaveLength(3);
  });

  it("handles Windows line endings in txt", () => {
    const result = parseFileText("Apple\r\nBanana\r\nCherry", "items.txt");
    expect(result.rows).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// parseFileText — CSV
// ---------------------------------------------------------------------------

describe("parseFileText (csv)", () => {
  it("parses a simple CSV with a header row", () => {
    const csv = "Name,Age,City\nAlice,30,NYC\nBob,25,LA";
    const result = parseFileText(csv, "people.csv");
    expect(result.format).toBe("csv");
    expect(result.headers).toEqual(["Name", "Age", "City"]);
    expect(result.hasHeader).toBe(true);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].fields).toEqual(["Alice", "30", "NYC"]);
    expect(result.rows[1].fields).toEqual(["Bob", "25", "LA"]);
  });

  it("treats all-numeric first row as data (synthetic headers)", () => {
    const csv = "10,20,30\n40,50,60";
    const result = parseFileText(csv, "numbers.csv");
    expect(result.hasHeader).toBe(false);
    expect(result.headers).toEqual(["Column 1", "Column 2", "Column 3"]);
    expect(result.rows).toHaveLength(2);
  });

  it("handles quoted fields with embedded commas", () => {
    const csv = 'Name,Company\nAlice,"ACME, Inc."\nBob,"Widget Corp"';
    const result = parseFileText(csv, "test.csv");
    expect(result.rows[0].fields[1]).toBe("ACME, Inc.");
  });

  it("handles escaped double-quotes inside quoted fields", () => {
    const csv = 'Name,Quote\nAlice,"She said ""hello"""';
    const result = parseFileText(csv, "test.csv");
    expect(result.rows[0].fields[1]).toBe('She said "hello"');
  });

  it("pads short rows to column count", () => {
    const csv = "A,B,C\n1,2\n3,4,5";
    const result = parseFileText(csv, "test.csv");
    expect(result.rows[0].fields).toEqual(["1", "2", ""]);
    expect(result.rows[1].fields).toEqual(["3", "4", "5"]);
  });

  it("handles Windows CRLF line endings", () => {
    const csv = "Name,Age\r\nAlice,30\r\nBob,25";
    const result = parseFileText(csv, "test.csv");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].fields[0]).toBe("Alice");
  });

  it("skips blank rows", () => {
    const csv = "Name,Age\nAlice,30\n\nBob,25\n";
    const result = parseFileText(csv, "test.csv");
    expect(result.rows).toHaveLength(2);
  });

  it("synthesizes missing header names", () => {
    const csv = "Alice,,NYC\nBob,25,LA";
    const result = parseFileText(csv, "test.csv");
    // First row has mixed content (not all numeric) → treated as header.
    // Second field is empty → gets "Column 2".
    expect(result.headers[1]).toBe("Column 2");
  });

  it("respects maxRows cap", () => {
    const lines = ["Name,Age", ...Array.from({ length: 100 }, (_, i) => `User${i},${i}`)];
    const result = parseFileText(lines.join("\n"), "test.csv", 10);
    expect(result.rows).toHaveLength(10);
    expect(result.rawLineCount).toBe(101);
  });

  it("returns empty rows array for a header-only CSV", () => {
    const result = parseFileText("Name,Age\n", "test.csv");
    expect(result.rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// parseFileText — TSV
// ---------------------------------------------------------------------------

describe("parseFileText (tsv)", () => {
  it("parses a TSV with a header row", () => {
    const tsv = "Name\tAge\nAlice\t30\nBob\t25";
    const result = parseFileText(tsv, "people.tsv");
    expect(result.format).toBe("tsv");
    expect(result.headers).toEqual(["Name", "Age"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].fields).toEqual(["Alice", "30"]);
  });
});

// ---------------------------------------------------------------------------
// rejectXlsx
// ---------------------------------------------------------------------------

describe("rejectXlsx", () => {
  it("throws a clear error with the filename", () => {
    expect(() => rejectXlsx("data.xlsx")).toThrow(/data\.xlsx/);
    expect(() => rejectXlsx("data.xlsx")).toThrow(/coming soon/i);
  });

  it("throws even without a filename", () => {
    expect(() => rejectXlsx()).toThrow(/coming soon/i);
  });
});

// ---------------------------------------------------------------------------
// getField
// ---------------------------------------------------------------------------

describe("getField", () => {
  const row = { fields: ["Alice", "30", "NYC"], lineNum: 2 };

  it("returns the field at the given index", () => {
    expect(getField(row, 0)).toBe("Alice");
    expect(getField(row, 2)).toBe("NYC");
  });

  it("returns empty string for out-of-range index", () => {
    expect(getField(row, 5)).toBe("");
  });
});
