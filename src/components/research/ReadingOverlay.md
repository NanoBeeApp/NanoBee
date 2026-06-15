# components/research/ReadingOverlay.tsx

## File responsibility
Centered modal reading panel for the active node: renders the article (with
clickable bold terms) and the three follow-up questions as chips, over a dimmed
backdrop.

## Core exports / API
- `ReadingOverlay()` — reads the active node from the store; null when none.

## Dependencies
- Upstream: `store/useResearchStore.ts`, `icons/icons.tsx`, `common/Markdown.tsx`.
- Downstream: `components/research/ResearchView.tsx`.

## Key implementation notes
- Bold terms → `growChild({ focusTerm })` (deep dive); follow-up chips →
  `growChild({ question })`. Both grow a child node and focus it.
- Structure: a `.rc-reading-scrim` backdrop flex-centers the `.rc-reading` sheet;
  clicking the backdrop closes, clicking the sheet `stopPropagation`s. White
  background, chrome minimized (floating close button, no header/footer bars).
- Shows loading / failed / root-hint states. While the article streams, the
  body renders its partial content (any text → `<Markdown>`); the spinner only
  shows before the first token lands (`loading && !content`), and a blinking
  `.rc-stream-cursor` `"正在生成…"` ("Generating…") footer shows while
  `loading && content`. Follow-up chips appear only after generation finishes
  (`!loading`).

## Change history

### 2026-06-15 — Quieter close button
- **Motivation**: the top-right close (X) button drew too much attention — it
  was a filled `--surface-2` chip with a 32px box and an 18px icon.
- **Goal**: make it recede so the article, not the chrome, holds focus.
- **Key decisions**: shrank the box to 26px and the icon to 15px, dropped the
  resting background (now transparent), and softened the icon to `--ink-4`
  (hover only lifts to `--ink-3`, no background). CSS lives in
  `src/styles/research.css` (`.rc-reading-close`); this file only changed the
  `<Icons.x>` size prop.

### 2026-06-14 — Custom follow-up + in-place Q&A turns (Phase C)
- **Motivation**: only AI-preset follow-ups (which grow children) existed; the
  reader couldn't ask their own question and get an inline answer.
- **Goal**: a custom-question input whose answer appends below the article as a
  chat-style turn, following Curve's pattern of appending the reader's own
  follow-up questions under the current article.
- **Key decisions**: a `.rc-ask` form calls `askInReading(node.id, q)` (store
  streams the answer into `node.userQuestionTurns`); `<ReadingQnaTurns>` renders
  them; an auto-scroll effect keyed on a compact latest-turn signature follows a
  streaming answer to the bottom. The form shows only once the article exists.

### 2026-06-14 — Rich article body + paragraph-grounded deep dives (Phase B)
- **Motivation**: the body was a bare `<Markdown>` that only made literal bold
  clickable; Curve's body had broader auto-terms, a selection bubble, and
  highlights, and fed the surrounding paragraph to the AI on deep-dive.
- **Goal**: swap the body for `<ReadingArticle>` (keyed by node id) and thread
  the deep-dive paragraph through to generation.
- **Key decisions**: `onDeepDive(term, focusParagraph)` → `growChild({ focusTerm,
  focusParagraph })`; the store + `/generate-stream` + content prompt now carry
  `focusParagraph` so the child grows around the reader's in-context interest.

### 2026-06-14 — Port Curve reading-flow features (Phase A)
- **Motivation**: the port had stripped the reading overlay down to title +
  body + follow-ups, dropping several Curve reading-flow behaviors the user
  wanted back.
- **Goal**: restore, as a first low-risk batch, the frontend-only features.
- **Key decisions / what landed**:
  - **Scroll memory**: `reading-progress.ts` saves/restores `scrollTop` per
    `project+node` (rAF restore on open, debounced save on scroll).
  - **Image lightbox**: pass `onOpenImage` to `<Markdown>` and render
    `ImageLightbox` (Escape / backdrop-click closes).
  - **Back-to-parent**: a button (flows above the title) that `openNode`s the
    parent, so deep-diving a term is reversible without closing.
  - **Summary positioning**: track `openedAsLoading` (adjust-state-during-render
    keyed by node id). Revisit → summary as a top intro; first visit (watched it
    generate) → summary as a bottom `"本篇摘要"` ("Article summary") takeaway
    before the follow-ups.
  - **Awaiting-body pending state**: outline stub with no filled body shows a
    `"生成正文"` ("Generate article") prompt instead of silently blank.

### 2026-06-14 — Restore Curve's streaming blank-area buffer
- **Motivation**: the port dropped Curve's `streaming-bottom-spacer`. Without it,
  the newest streamed line always hugged the bottom edge of the sheet, forcing
  the reader to scroll down repeatedly to keep the live output in view.
- **Goal**: reproduce Curve's behavior — scroll down once, then have new tokens
  fill a screenful of blank space below so re-scrolling isn't needed.
- **Key decision**: render a `.rc-stream-spacer` (≈ one screen tall) only while
  `loading && content`, paired with `overflow-anchor: none` on `.rc-reading-scroll`
  so appending text below the viewport never auto-nudges scrollTop. Adapted to
  NanoBee's plain `overflow-y:auto` div (no Radix ScrollArea / subtree swap), so
  the lighter CSS approach replaces Curve's full custom scroll-anchor effect.

### 2026-06-14 — Drop the tag row above the article title
- **Motivation**: the row of tag chips at the top of the reading detail added
  visual noise above the title without carrying core reading value.
- **Goal**: maximize the reading content area and cut distraction per the
  "minimal-first, no gratuitous decorative elements" rule.
- **Key decision**: removed the `.rc-reading-tags` block (and its + `.rc-tag`
  CSS); `node.tags` data is kept on the model, only its display is dropped.

### 2026-06-14 — Stop the layout jumping while streaming
- **Motivation**: with the typewriter render in place, each token re-parsed
  incomplete markdown, so unclosed markers snapped into styled elements as their
  closers arrived and reflowed the whole article on every frame.
- **Goal**: keep the streamed body structurally stable frame to frame.
- **Key decision**: pass `streaming={loading}` to `<Markdown>` so partial frames
  are balanced via `completeStreamingMarkdown` and highlighting is deferred; once
  `loading` clears (final result), it falls back to the normal full render.

### 2026-06-14 — Render streaming article (typewriter)
- **Motivation**: the overlay only knew "loading (spinner)" vs "ready (full
  body)", so even after the store began streaming tokens it would hide the body
  until generation finished.
- **Goal**: show the body the moment any text exists and surface a live
  "generating" affordance, so the typed-out output is visible again.
- **Key decision**: gate the body on `hasContent` (not `!loading`), keep the
  spinner only for `loading && !content`, and add a blinking-cursor footer for
  `loading && content`. Follow-ups still wait for `!loading` since the contract
  emits `content` before `questions`.

### 2026-06-13 — Switch to the shared `<Markdown>` component
- **Motivation**: chat and reading should share one markdown renderer
  (Curve-style react-markdown), replacing the bespoke `MarkdownLite`.
- **Goal**: render `<Markdown className="rc-prose" onTermClick={…}>`; the
  deep-dive-on-bold interaction is preserved via the component's optional
  `onTermClick` (bold → `.rc-term` button). `MarkdownLite` was deleted.
- **Key decision**: `.rc-prose` now only sets prose CSS variables; `.markdown-body`
  owns element styling. Kept the `research-article-body` testid.

### 2026-06-13 — Centered modal (was right-docked drawer)
- **Motivation**: The port had made reading a right-docked drawer; the user
  asked for Curve's original centered-popup design, not a side panel.
- **Goal**: Match Curve's reading layout (centered sheet over a dimmed backdrop).
- **Key decision**: Nest the sheet inside the backdrop and flex-center it
  (mirroring Curve's `.reading-overlay`/`.reading-sheet`), keeping NanoBee's
  white-Stripe sheet styling since the project bans Curve's sketch theme.

### 2026-06-13 — Created
- **Motivation**: Curve's reading overlay is the product's face (flow reading +
  three follow-ups + bold deep-dive); reproduce it in NanoBee's style.
- **Goal**: One panel that closes the read → follow-up → grow loop.
- **Key decision**: (superseded) Right-docked panel; later changed to a centered
  modal to match Curve's original design.
