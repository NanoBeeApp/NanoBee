# worker/routes/artifacts.ts

## Responsibility
Artifacts API routes: list, read, and delete artifacts belonging to the current owner. Artifacts are created indirectly by the chat agent tool — there is **no** create endpoint here.

## Core exports / API
- `artifactRoutes`: mounted at `/api/artifacts`
- `GET /`: list (descending order, includes full deck)
- `GET /:id`: read a single artifact
- `POST /:id/favorite`: toggle favorite; body `{ favorited: boolean }` (client sends target value, idempotent); returns `{ favorited }`; 404 if the row does not exist
- `DELETE /:id`: delete

## Dependencies
- Upstream: `auth/*`, `artifacts/repo.ts`
- Downstream: mounted in `routes/api.ts`; consumed by the frontend via typed RPC `apiClient.artifacts.*`

## Key implementation notes
- `owner` = logged-in user id or anon.
- Creation goes through the chat tool, so there is no `POST`; the focus is read and delete.

## Change history

### 2026-06-13 — created
- **Motivation**: the Artifacts page needs to fetch card decks produced by the chat.
- **Goal**: list / read / delete endpoints (no create).
- **Key decisions**: no create endpoint — the chat agent tool is the only creation path, keeping responsibilities separate.

### 2026-06-15 — favorite endpoint
- **Motivation**: the artifacts page adds a "Favorites" tab (`你收藏的`, Your favorites), which requires a favorite toggle.
- **Goal**: add `POST /:id/favorite`.
- **Key decisions**: the client sends the target `favorited` value (idempotent, no read-modify-write race); `setArtifactFavorited` returning `null` yields a 404.
