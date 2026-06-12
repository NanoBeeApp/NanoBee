# src/worker/agent/skills.ts

## Responsibility
Built-in skills: local agent tools with no external service. Currently
`get_current_time` (models have no clock) and `calculate` (exact arithmetic).

## Core exports / API
- `skillTools(): AgentTool[]` — the static skill registry

## Dependencies
- Upstream: `agent/tools.ts` (collector)
- Downstream: none (pure in-process functions)

## Notes
- `calculate` uses a recursive-descent parser (`+ - * / % ^`, parens, unary
  sign, right-assoc power) because Workers forbid `eval`/`new Function` and
  LLM mental math is unreliable.
- To add a skill, append an `AgentTool` to `SKILLS` — nothing else changes.

## Change history

### 2026-06-12 — created
- **Motivation**: the agent loop should ship with baseline local
  capabilities, not only remote data sources.
- **Key decision**: skills are plain `AgentTool`s in an array — the simplest
  registry that keeps additions one-line.
