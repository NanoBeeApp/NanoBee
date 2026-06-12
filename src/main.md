# src/main.tsx

## Responsibility
App entry point: imports the Ledger UI design-system CSS (tokens → base → app styles, order matters) and mounts `<App/>` into #root under StrictMode.

## Key exports
None (side-effect entry module).

## Dependencies
- Upstream: react-dom/client, src/App.tsx, src/styles/*
- Downstream: referenced by index.html

## Change history

### 2026-06-12 — created
- **Motivation**: design handoff implementation; CSS import order must mirror the prototype's <link> order so token cascade matches.
