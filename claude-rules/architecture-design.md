# 🏗️ Architecture design principles (important)

> Split from CLAUDE.md on 2026-06-15. This is an inseparable part of the CLAUDE.md rules (loaded on demand to keep the always-on context small). Must be fully followed when relevant; violating it equals violating CLAUDE.md.

- **Every architecture decision must work for both deployment targets**: (1) Cloudflare (Workers / D1 / KV / R2 / DO) and (2) self-hosted deployment (Docker, plain Node.js + SQLite/Postgres). When designing any feature, state explicitly how it runs in both environments; do not adopt a design that only works on Cloudflare without flagging it to the user first.
- **Keep platform-specific services behind adapter layers**: business logic must depend on narrow interfaces (storage, cache, queue, object store), with Cloudflare bindings and self-hosted backends as interchangeable implementations.
- **Stay lightweight — do not pull in heavy dependencies**: prefer the standard library, platform built-ins, and small focused packages over large frameworks/ORMs/SDKs. Before adding any new dependency, justify it: what it solves, why a lighter alternative (or ~50 lines of our own code) isn't enough, and its size/transitive-dependency cost. When in doubt, don't add it.

> Related: [storage-architecture.md](./storage-architecture.md) and [agent-runtime.md](./agent-runtime.md) build on these principles.
