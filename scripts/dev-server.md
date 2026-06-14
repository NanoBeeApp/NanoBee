# scripts/dev-server.sh

## Responsibility
Run the Vite dev server on the fixed port `3333`. The script does one thing —
`exec pnpm dev` after fixing up `PATH` and `cwd` — so a process supervisor can
track and restart it directly.

## Why it exists
The bare `pnpm dev` is a foreground process: closing the terminal, a crash, or
the process being killed takes the dev server down with no recovery. This script
is the program launched by the **launchd KeepAlive agent** `app.nanobee.dev`,
which restarts it automatically whenever it exits, so `http://localhost:3333`
stays up across crashes, kills, terminal closes, and re-logins.

## Core behavior
- Derives the repo root from the script's own location (portable if the
  checkout moves).
- Prepends the Homebrew `node@24` toolchain to `PATH` (launchd jobs start with a
  bare `PATH` that excludes Homebrew, so `pnpm`/`node` would otherwise be
  missing).
- `exec`s `pnpm dev` so launchd supervises the real process, not a wrapper.

## Dependencies
- **Upstream**: `pnpm`, the Node 24 toolchain, `vite.config.ts` (pins port 3333).
- **Downstream**: the launchd agent `~/Library/LaunchAgents/app.nanobee.dev.plist`.

## The launchd agent (`app.nanobee.dev`)
Installed at `~/Library/LaunchAgents/app.nanobee.dev.plist` (outside the repo —
it is machine-local config, not source). Key settings: `RunAtLoad` + `KeepAlive`
(restart on any exit), `ThrottleInterval=10` (min 10s between restarts to avoid a
crash loop), `ProcessType=Interactive` (no CPU throttling). Logs stream to
`private/logs/dev-server.log`.

### Manage it
```sh
# status / pid / run count
launchctl print gui/$(id -u)/app.nanobee.dev | grep -E 'state =|pid =|runs ='
# force a restart now
launchctl kickstart -k gui/$(id -u)/app.nanobee.dev
# stop & disable (until next load/login)
launchctl bootout gui/$(id -u)/app.nanobee.dev
# (re)load
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/app.nanobee.dev.plist
# follow logs
tail -f private/logs/dev-server.log
```
Convenience wrappers are exposed as `pnpm dev:daemon:{status,restart,logs,stop,start}`.

## Notes / gotchas
- The agent must be the **only** thing serving 3333. If a stray `npm run dev` /
  `pnpm dev` is already on 3333, the agent's Vite falls back to 3334; kill the
  stray, then `kickstart -k` the agent to reclaim 3333.

## Change history

### 2026-06-14 — created
- **Motivation**: the user reported the port-3333 dev server "keeps getting shut
  down" — a foreground `pnpm dev` dies on terminal close / crash / kill with no
  recovery.
- **Goal**: keep `http://localhost:3333` continuously up without depending on any
  terminal window or editor session.
- **Key decision**: use a native macOS launchd KeepAlive agent (auto-restart +
  start-at-login) instead of `nohup`/`pm2`/a manual loop, so recovery survives
  crashes, kills, and re-logins with zero extra dependencies.
