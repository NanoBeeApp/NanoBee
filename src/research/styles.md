# research/styles.ts

## File responsibility
Defines the user-selectable "AI reply style" for the Research Canvas — the set
of presets (`科普 / 专业 / 简练`) and the Chinese prompt directives that re-shape
both the outline and the article output (tone, depth, terminology, length).

## Core exports / API
- `RESEARCH_STYLE_IDS` — stable id tuple (also feeds the worker's zod enum).
- `ResearchReplyStyle` — union type derived from the ids.
- `DEFAULT_RESEARCH_STYLE` — `"popular"` (科普), matching the product's default
  voice so existing behavior is preserved when nothing is chosen.
- `RESEARCH_STYLE_OPTIONS` — `{ id, label, description }[]` for the settings UI.
- `normalizeReplyStyle(value)` — coerce unknown → valid id (falls back to default).
- `researchStyleDirective(style, mode)` — the prompt block appended to the
  system prompt; mode is `"outline" | "content"`.

## Dependencies
- Upstream: none (pure data/strings).
- Downstream: `research/types.ts` (input field type), `research/prompt.ts`
  (weaves the directive), `worker/routes/research.ts` (zod enum),
  `store/useResearchPrefs.ts` (persisted preference),
  `components/settings/AiSettingsForm.tsx` (style picker UI).

## Key implementation notes
- Style ids are persisted + sent over the wire, so they must stay stable; labels
  and directives are product output and stay Chinese (public-repo language rule
  carves out product strings, same as `research/prompt.ts`).
- The directive is appended AFTER the base prompt rules and explicitly states it
  outranks the default tone/length, so each style can override (e.g. 简练 shrinks
  the 500~1200 字 target to 300~600). The contract (`research/contract.ts`) does
  not enforce a min content length, so shorter output stays valid.

## Change history

### 2026-06-18 — Created
- **Motivation**: add an "AI reply style" choice in Research Canvas settings so
  users can switch the generated outline + article voice (popularization /
  professional / concise).
- **Key decision**: keep it a browser-local preference threaded through the
  generation request (mirrors how `locale` flows) rather than a server/D1 field —
  lighter, works signed-out, and reuses the existing prompt-builder seam.
