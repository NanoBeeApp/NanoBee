# src/worker/batch/file-parser.ts

## Purpose

Hand-written, dependency-free parser for CSV / TSV / TXT files uploaded to
the batch task engine. Converts raw file text into a structured `ParseResult`
with headers and data rows.

## Key design decisions

- **No xlsx**: `.xlsx` is explicitly rejected via `rejectXlsx()` with a clear
  "coming soon" message. Heavy xlsx parsing libraries (exceljs, SheetJS) are
  Node-only or too large for Cloudflare Workers edge bundles.
- **RFC 4180 CSV quoting**: the `parseCsvFields()` inner function handles
  quoted fields with embedded commas, escaped double-quotes (`""`), and
  embedded newlines (rare but valid in CSV).
- **Header heuristic**: a first row whose every non-empty field is a pure
  number is treated as data, and synthetic headers ("Column 1", "Column 2"…)
  are generated. Any row with at least one non-numeric field is treated as
  a header row.
- **TXT format**: one value per line, single column named "Value".
- **maxRows cap**: defaults to 5000 to prevent memory spikes on giant uploads;
  the UI can warn the user when `rawLineCount` exceeds the cap.
- **Pure functions**: no I/O, no side-effects — easy to unit-test and safe in
  Cloudflare Workers where global scope I/O is forbidden.

## Exports

| Symbol | Description |
|---|---|
| `rejectXlsx(filename?)` | Throws a user-friendly "coming soon" error for .xlsx |
| `detectFormat(text, filename?)` | Sniff the format from extension or content |
| `parseFileText(text, filename?, maxRows?)` | Main parse entry point |
| `getField(row, columnIndex)` | Safe column accessor |
| `ParseResult` | Return type of parseFileText |
| `ParsedRow` | One data row with fields array + lineNum |

## Change history

- 2026-06-15: Initial creation for batch task engine (P3).
