# src/worker/batch/detect-columns.ts

## Purpose

AI-powered column detection for the batch task engine. Given the first N rows
of a parsed file, calls the LLM once to identify the primary input column and
propose a one-line per-row action description.

## Design

Follows the exact same pattern as `src/worker/agent/task-compiler.ts`:
- Uses `generateAgentTurn` + a system prompt for a structured-output call.
- Tolerant JSON parsing: extracts the first `{…}` block from the model output.
- Zod validation with a `repairDetection()` pass that clamps the column index
  to a valid range.
- Returns a safe fallback (`fromAi: false`) on any failure path so the preview
  endpoint always returns something useful — even without an API key.

## Exported API

| Symbol | Description |
|---|---|
| `detectColumns(cfg, parsed)` | Main entry — calls LLM, returns BatchDetection |
| `BatchDetection` | `{ inputColumnIndex, inputColumnName, suggestedAction, fromAi }` |

## Change history

- 2026-06-15: Initial creation for batch task engine (P3).
- 2026-06-15: Fixed TS2345 — `rec.inputColumnIndex` typed as `unknown` after object spread; added explicit `as number` cast on line 104 inside the repairDetection helper (the surrounding type guard already narrows to `number`, but the spread loses that narrowing).
