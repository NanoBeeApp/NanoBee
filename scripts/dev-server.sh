#!/bin/sh
# Run the NanoBee Vite dev server (fixed port 3333).
#
# This script is launched and auto-restarted by the launchd agent
# `app.nanobee.dev` (see scripts/dev-server.md). It can also be run by hand
# for a one-off foreground session:  ./scripts/dev-server.sh
#
# It deliberately does ONE thing — exec `pnpm dev` — so launchd can track the
# process directly and restart it the moment it exits (KeepAlive).

set -eu

# Resolve the repo root from this script's own location, so the agent keeps
# working even if the checkout moves.
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_DIR=$(dirname "$SCRIPT_DIR")

# launchd starts jobs with a bare PATH that excludes Homebrew, so the Node 24
# toolchain (pnpm/node) would not be found. Put it on PATH explicitly.
export PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

cd "$REPO_DIR"
exec pnpm dev
