# 🗄️ Storage architecture principles (D1 vs Durable Objects)

> Split from CLAUDE.md on 2026-06-15. This is an inseparable part of the CLAUDE.md rules (loaded on demand to keep the always-on context small). Must be fully followed when relevant; violating it equals violating CLAUDE.md.

D1 and Durable Objects are **complementary, not competing**: D1 is the "one central SQL database" model; a Durable Object is a globally unique, single-threaded compute unit with its own SQLite store, where "fetch object by key" *is* the sharding. Apply these rules to all future storage/feature design:

- **Current stage**: NanoBee's scale fits a single D1 database — keep using it as the central store. Do not introduce Durable Objects prematurely.
- **Use D1 for**: global metadata / config / dictionary tables; cross-entity SQL queries (admin, reporting, "all users matching X"); read-heavy data (global read replicas via Sessions API); any dataset with low write QPS that fits well under the 10 GB per-database cap.
- **Use Durable Objects for**: data naturally partitioned by an entity (user / session / room) that needs high write throughput or strong in-entity consistency — real-time collaboration, chat rooms, WebSocket sessions, per-user inboxes, serialized state machines (counters, inventory, rate limiters, locks).
- **Migration trigger**: when one data class approaches D1's single-writer throughput (sustained hundreds of writes/s) or the 10 GB cap, move *that class* to one-DO-per-user; D1 retreats to global metadata and queries. Do not hand-roll hash-sharded D1 databases — DO-per-entity is the platform-native answer.
- **Hot counters never live in D1**: no `UPDATE ... SET count = count + 1` on high-frequency paths; use a Durable Object (or KV snapshot) and periodically flush to D1.
- **Cross-object analytics**: DOs cannot be queried globally. Any reporting over DO-held data must go through an export pipeline (DO → Queues → R2 / analytics store), designed up front.
- **Self-hosting caveat**: DOs are not portable off Cloudflare. As long as Docker self-deployment remains a product goal, keep storage access behind an adapter layer so the same business code can run on SQLite/Postgres outside Cloudflare.
