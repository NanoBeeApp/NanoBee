# 🤖 Agent runtime principles (important)

> Split from CLAUDE.md on 2026-06-15. This is an inseparable part of the CLAUDE.md rules (loaded on demand to keep the always-on context small). Must be fully followed when relevant; violating it equals violating CLAUDE.md.

**The agent runs in the browser. Treat the browser — not Node — as the primary runtime, and never assume a filesystem or a shell.** The agent core must stay runtime-agnostic so the exact same code runs in the browser (primary), Cloudflare Workers, and self-hosted Node. This is why Claude Code's filesystem/shell-centric design cannot be copied verbatim — every such capability needs a browser-native replacement.

- **Runtime-agnostic core behind a `RuntimeAdapter`**: agent-core (loop, tools, compaction, permissions, sub-agents) depends only on Web-standard APIs (`fetch`, `ReadableStream`, `AbortController`, `WebCrypto`, IndexedDB/OPFS) plus a narrow `RuntimeAdapter` interface — **zero `node:*`, zero DOM, zero Cloudflare bindings, zero React**. Each runtime supplies its own adapter; never thread `Env` / `fs` straight into loop or tool code.
- **No filesystem → use browser storage**: never assume `fs` / `path` / `child_process`. Persistence and large-tool-result spillover use **OPFS / IndexedDB** in the browser (R2 + D1 on Workers, SQLite + fs on Node). Large tool results spill to blob storage and the model receives a **handle, not the full text**, in the prompt.
- **No shell/Bash in the browser**: there is no `child_process` equivalent, and **arbitrary model-generated code must never be `eval`'d**. Use sandboxed compute (Web Worker / WASM) for pure computation, and whitelisted tools (data-hub, backend APIs) for any real-world action.
- **Sub-agents**: spawn a **Web Worker** in the browser (isolated context, off the UI thread) or recurse in Worker/Node — never a process spawn. Keep a depth limit and exclude the spawn tool from the child tool pool to prevent runaway recursion.
- **Keys never reach the client in plaintext**: BYOK keys are encrypted in IndexedDB (WebCrypto) and only placed in the `Authorization` header; the browser talks to providers directly (e.g. Anthropic `anthropic-dangerous-direct-browser-access`), with a stateless Worker proxy only for CORS-blocked providers. Keys must never appear in prompts or logs.
- **Loop exit signal**: end a turn based on "did this turn emit a tool call", and **never trust the API `stop_reason`** (it is unreliable while streaming).

This complements [architecture-design.md](./architecture-design.md) and [storage-architecture.md](./storage-architecture.md).
