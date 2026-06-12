# NanoBee

**NanoBee is a proactive AI assistant for everyday users.** It knows what you
care about and reaches out when something important happens — instead of
waiting to be asked.

> 一个"主动找你"的 AI 助理：你告诉它你关心什么，重要的事它来通知你。

## Product surfaces

- **Chat home** — a ChatGPT-style conversation surface. Proactive,
  AI-initiated messages stand out as amber cards. Tasks are created right
  from the conversation: AI-proposed task cards (one click to confirm,
  configuration collapsed into chips), text-selection → "set as reminder",
  or `/` slash commands in the composer.
- **Today page (今日事项)** — an Inoreader-style reading surface for
  everything you need to care about right now: timeline (tweet-card,
  default) / list / card views, topic filters, expand-to-read,
  scroll-past auto-read and a reading progress bar.
- **Sidebar** — switches between flat chat history and AI-managed topic
  groups (e.g. gold · investing, kids' education); an amber "今日事项"
  entry carries the unread count.
- **Task rail** — the current topic's live monitor and task cards with
  trigger, latest result, next run and an on/off toggle.
- **Global quick chat** — a floating composer on every non-chat surface.
  Replies slide up in an overlay, hand off to the full chat page, and are
  context-aware (the AI knows which item you are reading).

## Tech stack

- React 18 + TypeScript + Vite (client-side SPA; data is mocked for now)
- zustand for app state
- Ledger UI design system (tokens + base CSS in `src/styles/`), ported from
  the approved design prototype

## Development

```bash
pnpm install
pnpm dev       # http://localhost:5173
pnpm build     # type-check + production build
```

## Repository conventions

- Everything outside `private/` is public and written in English.
- Every source file has a same-name `.md` companion documenting its
  responsibility, exports, dependencies and change history.
- Interactive elements carry business-meaningful `data-testid` attributes
  for e2e testing.

## License

MIT — see [LICENSE](./LICENSE).
