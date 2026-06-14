# useImeComposition.ts

## Responsibility
Shared React hook that makes "Enter-to-submit" text inputs safe for IME
(Input Method Editor) users — Chinese (pinyin), Japanese (kana), Korean
(hangul). It distinguishes an Enter that *confirms an in-progress IME
candidate* from an Enter that *submits the input*, so picking a Chinese word no
longer fires a premature send.

## Core export / API
`useImeComposition()` returns:
- `composingRef`: a `MutableRefObject<boolean>`, true while a composition is in
  progress. Exposed for places that need the raw flag (e.g. a window-level
  native `keydown` listener that can't spread props).
- `compositionProps`: `{ onCompositionStart, onCompositionEnd }` — spread onto
  the `<input>` / `<textarea>` to keep the ref in sync.
- `isSubmitEnter(e)`: given a React `KeyboardEvent`, returns `true` only for a
  plain Enter that should submit (Enter, no Shift, not composing). Uses the ref
  first, with the native `isComposing` / `keyCode === 229` flags as fallback.

## Dependencies
- Upstream: `react` (`useRef`).
- Downstream: `chat/Composer.tsx`, `quickchat/QuickChat.tsx`,
  `research/ResearchWelcome.tsx`.

## Key implementation notes
- We keep our own ref because `keydown` fires *before* `compositionend`, so the
  native `KeyboardEvent.isComposing` flag is unreliable at the moment we test
  the Enter keydown — the ref is still `true` there.
- `keyCode === 229` is the legacy "composition is happening" sentinel some
  browsers/IMEs still emit; kept as a defensive fallback alongside `isComposing`.

## Change history

### 2026-06-14 — Created
- **Why**: pressing Enter to confirm a Chinese IME candidate in the main chat
  composer was being captured as "send", firing the message prematurely. The
  same bug existed in three separate composers, each re-implementing (or
  missing) the guard.
- **Goal**: extract one proven IME guard so every composer behaves identically
  and future inputs get it for free.
- **Key decision**: model it as a tiny hook returning both the ref (for raw
  native listeners) and a `compositionProps` spread + `isSubmitEnter` test, so
  callers stay one line each.
