# 0017_onboarding_flag.sql

## Purpose

Adds an `onboarding_done` INTEGER column (default `0`) to the `users` table.

The first-run onboarding flow checks this flag on bootstrap. When it is `0`
and the user has no tasks yet, the 3-step guided flow is shown. Once the user
completes or skips the flow the app calls `POST /api/onboarding/done`, which
flips the flag to `1` — the flow never re-appears after that.

Existing users who already have tasks will have the flag auto-set to `1` by
the bootstrap route (to avoid showing the onboarding to existing active users).

## Change history

- 2026-06-15  Initial migration.
