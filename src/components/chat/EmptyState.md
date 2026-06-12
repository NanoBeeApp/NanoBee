# src/components/chat/EmptyState.tsx

## Responsibility
New-chat empty state: a single light headline ("聊点什么有趣的话题？") that invites the user to start a conversation. No logo, no subline, no interactive controls — the Composer below handles input.

## Dependencies
- Downstream: ChatView

## Change history

### 2026-06-12 — strip to a single headline
- **Motivation**: the empty state still carried the brand glyph plus a headline and a descriptive subline, which felt heavier than needed for a blank new chat.
- **Goal**: a minimal, friendly entry point — just one inviting line.
- **Key decision**: removed the glyph and the value-prop subline, changed the headline to a lighter, conversational "聊点什么有趣的话题？"; pruned the now-dead `.glyph-big` / `.nb-empty p` CSS and dropped the `Icons` import.

### 2026-06-12 — remove starter cards
- **Motivation**: the four starter suggestion cards added visual weight to the empty state and pushed the user toward canned topics.
- **Goal**: a cleaner, calmer empty state that just states the value prop and lets the user type freely.
- **Key decision**: dropped the `STARTERS` grid and the now-unused `onSend` prop; pruned the dead `.nb-starter*` CSS.

### 2026-06-12 — simplify subtitle copy
- **Motivation**: the original subtitle was a two-clause sentence that slightly over-explained the value prop; the phrasing "——不用你天天来问" felt defensive.
- **Goal**: a shorter, more confident line that still leads with the key benefit ("主动找你").
- **Key decision**: trimmed from "告诉我你关心的事，我会在重要的时候 主动找你——不用你天天来问。" to "告诉我你关心的事，重要的时候我会**主动找你**。" — preserves the amber-highlighted payoff word without the filler clause.

### 2026-06-12 — created
- **Motivation**: guides first-time users straight into the "ask me to watch something" loop.
