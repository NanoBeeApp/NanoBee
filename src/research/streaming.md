# research/streaming.ts

## File responsibility
Tolerant, incremental extraction of the `content` field from a partial,
still-streaming research JSON payload — so the reading overlay can show the
article body as a live typewriter before the JSON object is closed.

## Core exports / API
- `extractStreamingContent(raw: string)` → `string` — decode the JSON string
  value of the first top-level `content` key from a possibly-incomplete
  document. Returns the text decoded so far (escapes resolved), or `""` if the
  `content` field hasn't started streaming yet.

## Dependencies
- Upstream: none (pure, platform-agnostic string function).
- Downstream: `store/useResearchStore.ts` (called on every streamed token to
  update the active node's partial content).

## Key implementation notes
- The content-mode contract emits `content` first
  (`{"content":"...","questions":[...],...}`), so the body streams before any
  other field — ideal for a typewriter.
- Display-only: the authoritative parse still happens via `parseModelPayload`
  on the full reply (and any repair retry). This extractor never validates.
- Deliberately tolerant: an incomplete trailing escape (`\` with no following
  char, or a short `\uXXXX`) stops early instead of throwing, so every
  intermediate buffer yields clean text.

## Change history

### 2026-06-14 — Created
- **Motivation**: The research reading detail page generated its article in one
  shot (spinner → whole article appears) because the body is embedded in a
  strict JSON contract that can only be parsed whole. The user asked for the
  streaming/typewriter output back.
- **Goal**: Let the client render the body token-by-token while the model is
  still emitting the surrounding JSON, without changing the AI contract or
  weakening the authoritative server-side validation.
- **Key decision**: A tiny hand-rolled JSON-string decoder that reads only the
  first `content` value and tolerates a truncated tail — no streaming JSON
  parser dependency, and it leans on the contract's `content`-first field order.
