# NanoBee

This project is a **public open-source repository**. **The public repo must only contain public code and public documentation** — every other file produced during development does not belong here.

## 🌐 Language rules (important)

- **Everything in the public repo (outside `private/`) must be written in English**: code comments, docs, README files, script messages, etc. This is a public-facing repository.
- **Everything inside `private/` is written in Chinese** (chat history, planning, PRDs, logs, notes).
- This project rule overrides the global "write comments/docs in Chinese" preference. Conversation with the user stays in Chinese.

## 🔒 private/ directory (important)

- `private/` is an **independent private git repository** (remote: `WooodHead/NanoBee_Private`) nested inside this repo and ignored by the main repo's `.gitignore`.
- **AI can and should read** the contents of `private/` (chat history, project planning, etc.) as context.
- **All non-public files created during development must be written under `private/`** — never into the public directories of the main repo. This includes, but is not limited to:
  - Chat logs / chat-history screenshots with AI → `private/chat-history/`
  - Requirements documents (PRD) → `private/docs/` (e.g. `private/docs/requirements.md`)
  - Logs → `private/logs/`
  - Project planning, ideas, unpublished roadmaps → `private/planning/`
  - Design drafts, screenshots, prompts, debugging/explanatory artifacts → `private/design/`, `private/screenshots/`, `private/prompts/`, `private/explain/`
- **Rule of thumb**: if a file is not "code or documentation intended for external users", it goes into `private/`; when in doubt, default to `private/`.
- **🚫 Never reference concrete `private/` file paths in public docs (including this CLAUDE.md)**: `private/` is not committed to the public repo, so such links are dangling and confusing for anyone who clones it. Public docs must be self-contained — if background from a private document matters, summarize the conclusion inline instead of linking to it. (Describing the `private/` *convention* itself, as this section does, is fine.)
- **Version-control rules**:
  - Changed files under `private/` → `git add / commit / push` separately inside the `private/` directory (pushed to the private remote).
  - Changed files in the main repo → commit normally at the repo root; `private/` is ignored automatically.
  - 🚫 Never commit files under `private/` to the main repo under any circumstances (`.gitignore` + pre-commit hook provide double protection — do not bypass them).
- After cloning this repo, reinstall the protection hook: `cp scripts/git-hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit`

## 🚀 Domains & deployment

- **Domain**: `nanobee.app` (Cloudflare zone in this account).
  - Production worker `nanobee` → `nanobee.app`
  - Dev worker `nanobee-dev` → `dev.nanobee.app`
  - Both are Workers Custom Domains declared in `wrangler.json` (`routes` with `custom_domain: true`); wrangler manages DNS + certificates on deploy.
- **Default deploy target is the dev environment only** (`pnpm deploy:dev`). **Never deploy to production unless the user explicitly asks for it in the current request** (`pnpm deploy:prod`). This project rule overrides the global "always deploy dev and prod together" preference.

## 🏗️ Architecture design principles (important)

- **Every architecture decision must work for both deployment targets**: (1) Cloudflare (Workers / D1 / KV / R2 / DO) and (2) self-hosted deployment (Docker, plain Node.js + SQLite/Postgres). When designing any feature, state explicitly how it runs in both environments; do not adopt a design that only works on Cloudflare without flagging it to the user first.
- **Keep platform-specific services behind adapter layers**: business logic must depend on narrow interfaces (storage, cache, queue, object store), with Cloudflare bindings and self-hosted backends as interchangeable implementations.
- **Stay lightweight — do not pull in heavy dependencies**: prefer the standard library, platform built-ins, and small focused packages over large frameworks/ORMs/SDKs. Before adding any new dependency, justify it: what it solves, why a lighter alternative (or ~50 lines of our own code) isn't enough, and its size/transitive-dependency cost. When in doubt, don't add it.

## 🎨 UI rules

- **Every page must have a white background** (`var(--bg)` = `#ffffff`). Page-level containers (reading surfaces, task center, auth pages, chat, etc.) must never use gray fills like `var(--surface-2)` / `var(--surface-3)` as their background — those tokens are reserved for small inset elements (hover states, chips, code/spark blocks), not whole pages.

## 🗄️ Storage architecture principles (D1 vs Durable Objects)

D1 and Durable Objects are **complementary, not competing**: D1 is the "one central SQL database" model; a Durable Object is a globally unique, single-threaded compute unit with its own SQLite store, where "fetch object by key" *is* the sharding. Apply these rules to all future storage/feature design:

- **Current stage**: NanoBee's scale fits a single D1 database — keep using it as the central store. Do not introduce Durable Objects prematurely.
- **Use D1 for**: global metadata / config / dictionary tables; cross-entity SQL queries (admin, reporting, "all users matching X"); read-heavy data (global read replicas via Sessions API); any dataset with low write QPS that fits well under the 10 GB per-database cap.
- **Use Durable Objects for**: data naturally partitioned by an entity (user / session / room) that needs high write throughput or strong in-entity consistency — real-time collaboration, chat rooms, WebSocket sessions, per-user inboxes, serialized state machines (counters, inventory, rate limiters, locks).
- **Migration trigger**: when one data class approaches D1's single-writer throughput (sustained hundreds of writes/s) or the 10 GB cap, move *that class* to one-DO-per-user; D1 retreats to global metadata and queries. Do not hand-roll hash-sharded D1 databases — DO-per-entity is the platform-native answer.
- **Hot counters never live in D1**: no `UPDATE ... SET count = count + 1` on high-frequency paths; use a Durable Object (or KV snapshot) and periodically flush to D1.
- **Cross-object analytics**: DOs cannot be queried globally. Any reporting over DO-held data must go through an export pipeline (DO → Queues → R2 / analytics store), designed up front.
- **Self-hosting caveat**: DOs are not portable off Cloudflare. As long as Docker self-deployment remains a product goal, keep storage access behind an adapter layer so the same business code can run on SQLite/Postgres outside Cloudflare.
