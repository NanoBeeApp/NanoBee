# Migration 0012 — Multi-tenant owner columns

## Purpose

Promotes the four core app tables (`chats`, `messages`, `tasks`, `updates`) from a
global shared pool to per-owner buckets.  Every row now carries an `owner` column
whose value is either the signed-in user's id (e.g. `u_abc123`) or the literal
string `"anon"` for signed-out visitors.  This mirrors the pattern already used by
`research_projects` (0007) and `artifacts` (0008).

All existing rows are backfilled to `"anon"` so the demo seed data and tests
continue to work without a database wipe.

## Change history & rationale

| Date       | Change |
|------------|--------|
| 2026-06-15 | Initial — multi-tenant isolation: `owner` column on chats/messages/tasks/updates, backfill to "anon", add `(owner, created_at DESC)` indexes. |
