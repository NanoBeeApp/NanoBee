# content-hash.ts

The one authoritative content-hash for data-view items. `computeContentHash(sourceId, raw)`
→ 24-char hex (SHA-256 via WebCrypto). Basis: source's own id when present, else
title+url. Imported everywhere dedup happens; never reimplemented.

## 变更历史与出发点
- 2026-06-15 新建（P1）。单一权威 hash 保证刷新/cron 去重一致（INSERT OR IGNORE 命中
  `UNIQUE(view_id, content_hash)`）。WebCrypto 在 Workers 与 Node≥19 都原生可用，双部署一致。
