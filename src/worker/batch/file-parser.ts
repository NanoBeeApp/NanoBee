/**
 * Hand-written CSV / TSV / TXT parser for the batch task engine.
 *
 * Supports:
 *  - CSV  (.csv)  — comma-delimited with optional RFC 4180 quoting
 *  - TSV  (.tsv)  — tab-delimited
 *  - TXT  (.txt)  — one value per line (single-column)
 *  - .xlsx         — intentionally rejected with a "coming soon" error
 *
 * No npm dependencies beyond what is already in the project.
 *
 * Design notes:
 *  - All functions are pure (no I/O) so they are easy to unit-test.
 *  - The parser handles Windows (\r\n) and Unix (\n) line endings.
 *  - CSV quoting follows RFC 4180: fields surrounded by double-quotes may
 *    contain commas, newlines, and escaped double-quotes ("").
 *  - Empty rows (after trimming) are silently skipped.
 *  - A row whose every field is empty is treated as a blank line (skipped).
 *
 * NEVER call these at module/global scope — they are pure helpers but
 * importing the module should be safe inside any scope.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A parsed row: either a single string (TXT) or an array of fields (CSV/TSV). */
export interface ParsedRow {
  /** Column values for this row. Single-column files still use an array. */
  fields: string[];
  /** Original 1-based line number for diagnostics. */
  lineNum: number;
}

/** Result returned by parseFileText. */
export interface ParseResult {
  /** Detected file format. */
  format: "csv" | "tsv" | "txt";
  /** Column headers. Populated from the first row if it looks like a header,
   *  or synthesized as "Column 1", "Column 2", … when the first row contains
   *  numeric-only values (heuristic: treat numeric-first rows as data). */
  headers: string[];
  /** Whether the first row was treated as a header (consumed, not in rows). */
  hasHeader: boolean;
  /** Data rows (first-row-as-header already removed when hasHeader=true). */
  rows: ParsedRow[];
  /** Total row count before filtering blanks (for diagnostics). */
  rawLineCount: number;
}

// ---------------------------------------------------------------------------
// xlsx guard
// ---------------------------------------------------------------------------

/**
 * Throw a clear "coming soon" error for xlsx uploads. Call this before
 * handing the file bytes to parseFileText when the file extension is .xlsx.
 */
export function rejectXlsx(filename?: string): never {
  throw new Error(
    `.xlsx files are not yet supported${filename ? ` (${filename})` : ""}. ` +
      "Please export your spreadsheet as .csv or .tsv and re-upload. " +
      "Native .xlsx support is coming soon.",
  );
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/**
 * Detect the delimiter format from a file extension or by sniffing the
 * first non-empty line of content.
 * Returns "csv", "tsv", or "txt".
 */
export function detectFormat(
  text: string,
  filename?: string,
): "csv" | "tsv" | "txt" {
  // Extension takes priority.
  if (filename) {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "csv") return "csv";
    if (ext === "tsv") return "tsv";
    if (ext === "txt") return "txt";
    // .xlsx is handled before reaching this function (rejectXlsx).
  }

  // Sniff the first non-blank line for tab characters.
  const firstLine = text
    .split(/\r?\n/)
    .find((l) => l.trim().length > 0) ?? "";
  if (firstLine.includes("\t")) return "tsv";
  if (firstLine.includes(",")) return "csv";
  // Fallback: single-column txt.
  return "txt";
}

// ---------------------------------------------------------------------------
// Core CSV parser (RFC 4180 subset)
// ---------------------------------------------------------------------------

/**
 * Split one CSV-format string into rows of fields.
 * Handles:
 *  - quoted fields with embedded commas, newlines, and "" escapes
 *  - mixed CRLF / LF line endings
 *  - trailing commas
 *
 * Returns raw rows (including potential blank rows).
 */
function parseCsvFields(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuote = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];

    if (inQuote) {
      if (ch === '"') {
        // Peek ahead: "" = escaped quote inside a quoted field.
        if (i + 1 < n && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          // Closing quote.
          inQuote = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
      continue;
    }

    // Not inside quotes.
    if (ch === '"') {
      inQuote = true;
      i++;
    } else if (ch === delimiter) {
      row.push(field.trim());
      field = "";
      i++;
    } else if (ch === "\r") {
      // CRLF or lone CR.
      row.push(field.trim());
      field = "";
      rows.push(row);
      row = [];
      i++;
      if (i < n && text[i] === "\n") i++; // consume the LF
    } else if (ch === "\n") {
      row.push(field.trim());
      field = "";
      rows.push(row);
      row = [];
      i++;
    } else {
      field += ch;
      i++;
    }
  }

  // Flush the last field/row.
  row.push(field.trim());
  rows.push(row);

  return rows;
}

// ---------------------------------------------------------------------------
// Header heuristic
// ---------------------------------------------------------------------------

/**
 * A row is likely a data-only row (not a header) when every non-empty field
 * is purely numeric. When the first row passes this check we treat it as data
 * and synthesize column headers instead.
 */
function looksLikeDataRow(fields: string[]): boolean {
  const nonEmpty = fields.filter((f) => f.length > 0);
  if (nonEmpty.length === 0) return true;
  return nonEmpty.every((f) => /^-?\d+(\.\d+)?$/.test(f));
}

/** Synthesize column names "Column 1", "Column 2", … */
function syntheticHeaders(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Column ${i + 1}`);
}

// ---------------------------------------------------------------------------
// Public parse function
// ---------------------------------------------------------------------------

/**
 * Parse raw file text into a structured ParseResult.
 *
 * @param text     File contents as a UTF-8 string.
 * @param filename Optional filename used for format detection (extension sniff).
 * @param maxRows  Maximum data rows to return (default 5000). Extra rows are
 *                 silently truncated; the rawLineCount still reflects the full
 *                 count so the UI can warn the user.
 */
export function parseFileText(
  text: string,
  filename?: string,
  maxRows = 5000,
): ParseResult {
  const format = detectFormat(text, filename);

  // Split into raw rows based on format.
  let rawRows: string[][];
  if (format === "csv") {
    rawRows = parseCsvFields(text, ",");
  } else if (format === "tsv") {
    rawRows = parseCsvFields(text, "\t");
  } else {
    // TXT: one value per line.
    rawRows = text
      .split(/\r?\n/)
      .map((l) => [l.trim()]);
  }

  const rawLineCount = rawRows.length;

  // Remove blank rows (every field empty or whitespace).
  const nonBlank = rawRows.filter((r) => r.some((f) => f.length > 0));

  if (nonBlank.length === 0) {
    return {
      format,
      headers: format === "txt" ? ["Value"] : syntheticHeaders(1),
      hasHeader: false,
      rows: [],
      rawLineCount,
    };
  }

  // Determine column count from the widest row.
  const colCount = Math.max(...nonBlank.map((r) => r.length));

  // TXT files always have one column named "Value".
  if (format === "txt") {
    const rows: ParsedRow[] = nonBlank.slice(0, maxRows).map((r, i) => ({
      fields: r,
      lineNum: i + 1,
    }));
    return {
      format,
      headers: ["Value"],
      hasHeader: false,
      rows,
      rawLineCount,
    };
  }

  // CSV / TSV: detect header row.
  const firstRow = nonBlank[0];
  const hasHeader = !looksLikeDataRow(firstRow);
  const headers = hasHeader
    ? firstRow.map((h, i) => (h.length > 0 ? h : `Column ${i + 1}`))
    : syntheticHeaders(colCount);

  const dataRows = hasHeader ? nonBlank.slice(1) : nonBlank;

  // Pad short rows to column count.
  const padRow = (r: string[]): string[] => {
    if (r.length >= colCount) return r.slice(0, colCount);
    return [...r, ...Array(colCount - r.length).fill("")];
  };

  const rows: ParsedRow[] = dataRows.slice(0, maxRows).map((r, i) => ({
    fields: padRow(r),
    lineNum: (hasHeader ? 2 : 1) + i,
  }));

  return { format, headers, hasHeader, rows, rawLineCount };
}

// ---------------------------------------------------------------------------
// Column-selection helper
// ---------------------------------------------------------------------------

/**
 * Return the field at `columnIndex` for a given parsed row.
 * Falls back to "" when the index is out of bounds.
 */
export function getField(row: ParsedRow, columnIndex: number): string {
  return row.fields[columnIndex] ?? "";
}
