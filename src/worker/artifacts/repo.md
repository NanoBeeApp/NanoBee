# worker/artifacts/repo.ts

## Responsibility
D1 persistence for the artifacts table. Each artifact occupies one row; the full card deck is stored as a JSON blob. Rows are isolated by owner (logged-in user id or `"anon"`).

## Core exports / API
- `ANON_OWNER`: bucket identifier for unauthenticated visitors
- `createArtifact(db, owner, deck, chatId?)`: inserts a row and returns the `Artifact` (id generated here)
- `listArtifacts(db, owner)`: lists artifacts in reverse-chronological order, including full deck, up to 100 rows
- `getArtifact(db, owner, id)`: fetches a single artifact
- `setArtifactFavorited(db, owner, id, favorited)`: sets the favorited flag; returns the new value, or `null` if no owned row matched
- `deleteArtifact(db, owner, id)`: deletes an artifact

## Dependencies
- Upstream: nanoid, `cards/types.ts`, `artifacts/types.ts`
- Downstream: `worker/agent/card-artifact-tools.ts` (create), `worker/routes/artifacts.ts` (list / get / delete)

## Key implementation notes
- The deck is stored as a single JSON blob, not split into per-card rows (reads are always whole-deck renders; card shape varies by kind; there are no cross-artifact card queries)
- Rows with corrupted JSON are skipped with a log entry during list/get
- Mirrors the storage pattern used by the research repo

## Change history

### 2026-06-13 — Created
- **Motivation**: the artifacts page needed to list and render card decks generated through chat
- **Goal**: minimal CRUD with owner isolation
- **Key decisions**: single-row JSON blob storage; denormalize `card_count` for list display

### 2026-06-15 — Added favorites
- **Motivation**: the artifacts page gained a Your favorites tab requiring persisted favorited state
- **Goal**: add a favorited flag to artifacts with read/write support
- **Key decisions**: added a boolean column to the existing row (scoped to the same owner, no cross-owner favorites); `setArtifactFavorited` issues a direct UPDATE to the specified value (idempotent, no read-modify-write race); uses `meta.changes` to detect whether an owned row was matched; extracted readable columns into a `SELECT_COLS` constant to keep all reads consistent
