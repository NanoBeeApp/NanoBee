# tests/batch-parser.spec.ts

## Purpose

Unit tests for the batch file parser (`src/worker/batch/file-parser.ts`).
All tests are pure — no I/O, no network, no server dependency.

## Coverage

- `detectFormat`: extension-based and content-sniffing detection.
- `parseFileText (txt)`: single-column line-by-line parsing, blank skip, CRLF.
- `parseFileText (csv)`: header detection, quoted fields (embedded commas,
  escaped double-quotes), row padding, CRLF, blank row skip, maxRows cap.
- `parseFileText (tsv)`: tab-delimited header + data rows.
- `rejectXlsx`: filename and no-filename variants; error message content.
- `getField`: valid index and out-of-range index.

## Change history

- 2026-06-15: Initial creation for batch task engine (P3).
