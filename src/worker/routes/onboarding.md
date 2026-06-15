# src/worker/routes/onboarding.ts

## Purpose

Hono routes that power the first-run onboarding flag for signed-in users.

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/onboarding` | Returns `{ done: boolean }` — whether the user has already completed (or skipped) the onboarding flow. |
| `POST` | `/api/onboarding/done` | Flips `users.onboarding_done` to `1`. Called by the client once the user clicks "完成" or "先随便看看". |

Anon visitors always receive `{ done: true }` so the UI never shows them the
first-run flow (they have no persistent identity to save the flag against).

## Design decisions

- The flag lives directly on the `users` row (migration 0017) rather than in a
  separate `user_prefs` table, because it is a one-shot piece of data with no
  expected siblings.
- The bootstrap response now includes `onboardingDone` so the client can decide
  whether to show the flow in a single round-trip rather than making two requests.

## Change history

- 2026-06-15  Initial implementation.
