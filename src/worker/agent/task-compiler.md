# task-compiler.ts

**Purpose**: NL→TriggerSpec compiler. Detects task/monitoring intent in a user's
chat message and extracts a structured `TaskSuggestionData` via one LLM call using
the same `resolveAiConfig` + `generateAgentTurn` pipeline as the main chat.

Returns `null` when the message is not a task intent or when the LLM call fails
(non-fatal — the chat continues without a suggestion card).

The three available data-hub source ids (`hackernews`, `websearch`, `gold`) are
embedded in the system prompt. When a new source is added to data-hub, the prompt
must be updated here to expose it to the compiler.

The cron engine (`src/worker/scheduler/engine.ts`) evaluates the resulting
`TriggerSpec` with **zero LLM calls and zero user API keys**.

## Change history & rationale

- **2026-06-15** — Initial implementation. Structured-output approach: single
  LLM call with a JSON-schema-like system prompt; tolerant parse+repair (mirrors
  `src/research/contract.ts`). Returns `null` on any failure so chat never breaks.
  Exposed as `compileTaskIntent(cfg, userMessage)` → `TaskSuggestionData | null`.
- **2026-06-15** — Bug fix: corrected the gold metric path in `SYSTEM_PROMPT` from
  `"items[0].price"` to `"items[0].xauUsdPerOz"` to match the actual field name
  returned by the data-hub gold source (`GoldItem.xauUsdPerOz`). Without this fix
  the LLM would generate gold condition specs that `extractMetric` could never
  resolve, causing all LLM-generated gold tasks to silently skip every cron tick.
- **2026-06-15** — Bug fix (found via live runtime test): raised the extraction
  call `maxTokens` from 512 → 1536. The JSON output carries a nested `triggerSpec`
  plus Chinese title/label/message text; 512 truncated it mid-string, so
  `extractJson` failed ("no JSON in model output") and EVERY suggestion card was
  silently dropped. This defeated the entire NL task-creation loop.
