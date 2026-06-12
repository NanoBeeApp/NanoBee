# src/components/chat/EmptyState.tsx

## Responsibility
New-chat empty state: brand glyph, "今天想让我帮你盯着什么?" headline and four starter cards that send a seed message.

## Dependencies
- Downstream: ChatView

## Change history

### 2026-06-12 — simplify subtitle copy
- **Motivation**: the original subtitle was a two-clause sentence that slightly over-explained the value prop; the phrasing "——不用你天天来问" felt defensive.
- **Goal**: a shorter, more confident line that still leads with the key benefit ("主动找你").
- **Key decision**: trimmed from "告诉我你关心的事，我会在重要的时候 主动找你——不用你天天来问。" to "告诉我你关心的事，重要的时候我会**主动找你**。" — preserves the amber-highlighted payoff word without the filler clause.

### 2026-06-12 — created
- **Motivation**: guides first-time users straight into the "ask me to watch something" loop.
