# src/components/onboarding/Onboarding.tsx

## Purpose

First-run onboarding overlay shown to newly signed-in users who have no tasks
yet. A lightweight 3-step conversational flow:

1. **Pick a scenario** — one representative template per category (monitor /
   news / schedule). Tapping one moves to the next step.
2. **Personalize** (optional) — if the template has configurable params (e.g.
   a price threshold or push time), show a mini-form so the user can adjust the
   defaults before creation. Skipped entirely for param-free templates.
3. **Confirm & create** — a one-tap "开始监控" button that creates the task
   optimistically via `store.createTask`, marks onboarding done, and navigates
   to the Tasks page.

A "先随便看看" skip link is present on every step. Dismissal (via completion
or skip) calls `store.markOnboardingDone()` which persists
`users.onboarding_done = 1` via `POST /api/onboarding/done`.

## Design

- Full-center overlay on a white `#ffffff` background.
- Honey/amber `--nb-honey` primary CTA (the proactive accent).
- Radix color tokens only; no Tailwind palette, no raw hex.
- Step dots for progress context without a heavy progress bar.
- Gentle fade+slide animation (`nb-ob-wrap`).

## Dependencies

- `src/lib/task-templates.ts` — template catalog and `applyParams` / `buildTriggerLabel`.
- `src/store/useAppStore.ts` — `markOnboardingDone`, `createTask`, `openTasks`.
- `src/data/ids.ts` — `nextId` (inside handler, never at module scope).
- `src/icons/icons.tsx` — `Icons`.

## Change history

- 2026-06-15  Initial implementation.
- 2026-06-15  Used `TOTAL_STEPS` in the confirm-step `StepDots` call (was unused local variable); fixes TS6133 error.
