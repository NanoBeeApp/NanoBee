# NanoBee

**NanoBee is a proactive AI assistant for everyday users.** It knows what you
care about and reaches out when something important happens — instead of
waiting to be asked.

## Product surfaces

- **Chat home** — a ChatGPT-style conversation surface. Proactive,
  AI-initiated messages stand out as amber cards. Tasks are created right
  from the conversation: AI-proposed task cards (one click to confirm,
  configuration collapsed into chips), text-selection → "set as reminder",
  or `/` slash commands in the composer.
- **Today page** — an Inoreader-style reading surface for
  everything you need to care about right now: timeline (tweet-card,
  default) / list / card views, topic filters, expand-to-read,
  scroll-past auto-read and a reading progress bar.
- **Sidebar** — switches between flat chat history and AI-managed topic
  groups (e.g. gold · investing, kids' education); an amber "Today"
  entry carries the unread count.
- **Task rail** — the current topic's live monitor and task cards with
  trigger, latest result, next run and an on/off toggle.
- **Global quick chat** — a floating composer on every non-chat surface.
  Replies slide up in an overlay, hand off to the full chat page, and are
  context-aware (the AI knows which item you are reading).

## Tech stack

- **Frontend**: React 19 + TypeScript, TanStack Start (file-based routing,
  SSR shell) with TanStack Query, zustand for app state
- **Design system**: Ledger UI tokens + base CSS in `src/styles/`, ported
  from the approved design prototype (app data is mocked for now)
- **Backend**: Hono on Cloudflare Workers — a single worker serves the app
  shell, static assets and all `/api/*` endpoints
- **Database**: Cloudflare D1 (SQLite at the edge) with versioned SQL
  migrations in `migrations/`
- **Type-safe API**: Hono RPC client (`src/lib/api-client.ts`) shares types
  with the worker, so every `/api` call is type-checked end to end

## Project layout

```
src/
  routes/        TanStack Router file-based routes (/ mounts the app shell)
  App.tsx        NanoBee app shell (chat / today views)
  components/    Feature components (components/ui = shadcn/ui primitives)
  data/          Mocked app data (until real endpoints land)
  store/         zustand app store
  styles/        Ledger UI design-system CSS (tokens → base → app)
  worker/        Hono API worker — all backend endpoints live here
    routes/      API route modules mounted under /api
    config.ts    Backend constants (single source of truth)
  lib/           Frontend utilities (typed API client, query client)
  server/        TanStack Start server functions
migrations/      D1 SQL migrations (applied with wrangler)
```

## Development

```bash
pnpm install
pnpm db:migrate:local   # apply D1 migrations to the local database
pnpm dev                # http://localhost:3333
pnpm build              # production build
pnpm test:run           # API integration tests (expects `pnpm dev` running)
```

## Deployment

Deploys to Cloudflare Workers; dev and prod are always released together:

```bash
pnpm db:migrate:dev && pnpm db:migrate:prod   # apply pending D1 migrations
pnpm deploy                                   # deploy prod + dev workers
```

| Environment | Worker | D1 database |
|-------------|--------|-------------|
| prod | `nanobee` | `nanobee-db` |
| dev | `nanobee-dev` | `nanobee-db-dev` |

## Repository conventions

- Everything outside `private/` is public and written in English.
- Every source file has a same-name `.md` companion documenting its
  responsibility, exports, dependencies and change history.
- Interactive elements carry business-meaningful `data-testid` attributes
  for e2e testing.
- `.env*` files are tracked by git and must never contain secrets; secrets
  go through `wrangler secret`.

## License

MIT — see [LICENSE](./LICENSE).
