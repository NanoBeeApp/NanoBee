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
- **Version-control rules**:
  - Changed files under `private/` → `git add / commit / push` separately inside the `private/` directory (pushed to the private remote).
  - Changed files in the main repo → commit normally at the repo root; `private/` is ignored automatically.
  - 🚫 Never commit files under `private/` to the main repo under any circumstances (`.gitignore` + pre-commit hook provide double protection — do not bypass them).
- After cloning this repo, reinstall the protection hook: `cp scripts/git-hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit`

## 🗄️ Storage architecture principles (D1 vs Durable Objects)

D1 and Durable Objects are **complementary, not competing**: D1 is the "one central SQL database" model; a Durable Object is a globally unique, single-threaded compute unit with its own SQLite store, where "fetch object by key" *is* the sharding. Apply these rules to all future storage/feature design:

- **Current stage**: NanoBee's scale fits a single D1 database — keep using it as the central store. Do not introduce Durable Objects prematurely.
- **Use D1 for**: global metadata / config / dictionary tables; cross-entity SQL queries (admin, reporting, "all users matching X"); read-heavy data (global read replicas via Sessions API); any dataset with low write QPS that fits well under the 10 GB per-database cap.
- **Use Durable Objects for**: data naturally partitioned by an entity (user / session / room) that needs high write throughput or strong in-entity consistency — real-time collaboration, chat rooms, WebSocket sessions, per-user inboxes, serialized state machines (counters, inventory, rate limiters, locks).
- **Migration trigger**: when one data class approaches D1's single-writer throughput (sustained hundreds of writes/s) or the 10 GB cap, move *that class* to one-DO-per-user; D1 retreats to global metadata and queries. Do not hand-roll hash-sharded D1 databases — DO-per-entity is the platform-native answer.
- **Hot counters never live in D1**: no `UPDATE ... SET count = count + 1` on high-frequency paths; use a Durable Object (or KV snapshot) and periodically flush to D1.
- **Cross-object analytics**: DOs cannot be queried globally. Any reporting over DO-held data must go through an export pipeline (DO → Queues → R2 / analytics store), designed up front.
- **Self-hosting caveat**: DOs are not portable off Cloudflare. As long as Docker self-deployment remains a product goal, keep storage access behind an adapter layer so the same business code can run on SQLite/Postgres outside Cloudflare.

Background and full comparison: `private/reports/do-vs-d1-report.html` (in Chinese).
