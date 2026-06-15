# src/components/compare/CompareComposer.tsx

## Responsibility
The compare page's shared bottom input: one prompt broadcast to every column.
Auto-growing textarea with IME-safe Enter-to-send.

## Props
`{ onSend(text), columnCount }`.

## Relationships
- Upstream: `lib/useImeComposition` (IME-safe Enter), `icons/icons`.
- Used by: `CompareView` (wires `onSend` to `store.run`).

## Notes
- Mirrors the main chat composer's IME handling (Enter sends, Shift+Enter newline,
  never sends mid-composition); clears on send and refocuses.

## Change history
### 2026-06-15 — Created
- Reason: the compare page needs a single shared prompt input for all columns.
- Goal: reuse the chat composer's IME-safe send behavior in a slim form.

### 2026-06-15 — English-only strings
- Reason: public-repo rule — all UI copy must be in English.
- Change: placeholder and hint text translated to English; hint now uses
  grammatically correct singular/plural ("1 model" vs "N models").
