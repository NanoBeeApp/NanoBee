# NanoBee · index

This project is a **public open-source repository**. **The public repo must only contain public code and public documentation** — every other file produced during development does not belong here.

> **This file is an index only.** The full detail of each rule (steps, examples, rationale, edge cases) lives in categorized files under `claude-rules/`.
> Each entry below keeps a one-line headline that is binding on its own; when a rule is relevant, **read the linked `claude-rules/*.md` file in full before acting**.
> Everything in this repo outside `private/` (including this file and everything in `claude-rules/`) is written in **English**.

## Governance & safety (read these first)

- **Repository governance (public/private repo hygiene)** → [claude-rules/repository-governance.md](./claude-rules/repository-governance.md)
  - **📁 Root is locked down**: never add any new file/dir directly under the repo root without confirming with the user first.
  - **🌐 Language**: everything in the public repo (outside `private/`) must be in **English**; everything inside `private/` is Chinese; conversation with the user stays Chinese.
  - **🔒 private/**: a nested independent private repo (`WooodHead/NanoBee_Private`); put **all** non-public dev artifacts there; never commit `private/` to the main repo; never reference concrete `private/` paths in public docs; reinstall the pre-commit hook after cloning.
  - **🔐 Pre-commit secret scan**: commits here are public forever — before every `git add`/`commit`, scan the actual staged diff for secrets/keys/PII; if found, STOP, warn the user by name, and do not commit.

## Deployment

- **🚀 Domains & deployment** → [claude-rules/deployment.md](./claude-rules/deployment.md)
  - Domain `nanobee.app` (prod worker `nanobee`, dev `nanobee-dev` → `dev.nanobee.app`). **Default deploy is dev only (`pnpm deploy:dev`); never deploy prod unless the user explicitly asks this turn.**

## UI

- **🎨 UI rules** → [claude-rules/ui-rules.md](./claude-rules/ui-rules.md)
  - Every page has a **white background** (`var(--bg)` = `#ffffff`); gray surface tokens are for small inset elements only. **Always maximize the main content area** — keep framing chrome (headers/footers/toolbars/nested cards) minimal. **🚫 Never casually float any UI element over/occluding the canvas or primary content** — show progress/loading/empty state IN PLACE (a size-matched skeleton), not a floating status pill; a floating element is justified only when genuinely transient and impossible to show in place (e.g. an error pill), and any overlay must clear fixed chrome (sidebar) so it neither hides behind it nor obstructs content.

## Architecture & runtime principles

- **🏗️ Architecture design principles** → [claude-rules/architecture-design.md](./claude-rules/architecture-design.md)
  - Every decision must work on **both** Cloudflare and self-hosted (Docker/Node + SQLite/Postgres); keep platform services behind adapter layers; stay lightweight (justify every new dependency).
- **🗄️ Storage architecture (D1 vs Durable Objects)** → [claude-rules/storage-architecture.md](./claude-rules/storage-architecture.md)
  - D1 and DOs are complementary: single D1 fits the current scale (don't add DOs prematurely); D1 for global metadata/cross-entity queries/read-heavy data, DOs for per-entity high-write/strong-consistency; hot counters never in D1; keep storage behind an adapter for self-hosting.
- **🤖 Agent runtime principles** → [claude-rules/agent-runtime.md](./claude-rules/agent-runtime.md)
  - The agent runs in the **browser** (primary runtime) — runtime-agnostic core behind a `RuntimeAdapter`, no fs/shell, browser storage (OPFS/IndexedDB), Web Worker sub-agents, BYOK keys encrypted client-side and never in prompts/logs, and never trust the API `stop_reason`.
