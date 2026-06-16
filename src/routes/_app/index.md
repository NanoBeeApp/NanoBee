# _app/index.tsx

## Responsibility
Home page route (`/`) — renders the main two-column `ChatView` (centered
composer) into the `_app` layout outlet.

## Core exports
- `Route` — `createFileRoute("/_app/")` with `component: ChatView`.

## Dependencies
- Upstream: `@tanstack/react-router`, `@/components/chat/ChatView`.
- Downstream: none.

## Change history

### 2026-06-15 — added errorComponent
- **Motivation**: per-route error isolation — a crash in ChatView or CompareView
  now shows `RouteErrorFallback` (retry + back-to-chat) instead of crashing the
  whole shell.

### 2026-06-13 — created
- **Motivation**: give the chat surface its own URL (`/`) under the new `_app`
  layout, replacing the old `routes/index.tsx` that mounted the whole app shell.
- **Goal**: chat is just one page among siblings; the shell lives in `_app`.
