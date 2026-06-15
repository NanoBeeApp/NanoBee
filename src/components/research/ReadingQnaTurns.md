# components/research/ReadingQnaTurns.tsx

## File responsibility
Renders the reader's in-place Q&A turns below a node's article (ported from
Curve's UserQuestionTurns). The reader's own custom follow-up questions are
answered inline (chat-style) instead of growing a new child node, so the
back-and-forth stays attached to the article it was asked about.

## Core exports / API
- `ReadingQnaTurns({ turns })` — renders `ResearchQnaTurn[]`; null when empty.

## Dependencies
- Upstream: `common/Markdown.tsx`, `research/types.ts`.
- Downstream: `components/research/ReadingOverlay.tsx` (owns the input + the
  `askInReading` store action; auto-scrolls to follow a streaming answer).

## Key implementation notes
- Each turn shows the question as a quiet inset block (background, not border)
  and the answer as streamed `<Markdown>`. While `status === "loading"` with no
  text yet it shows `"AI 正在回答…"` ("AI is answering…"); once tokens arrive
  the answer streams with a blinking-cursor footer.
- The answer is produced by reusing the content-mode stream (`askInReading`),
  grounded in the node's own article via context. A dedicated concise Q&A prompt
  is a possible future refinement (today the answer is a full-length article).

## Change history

### 2026-06-14 — Created (Phase C port)
- **Motivation**: NanoBee only had AI-preset follow-up chips that grow children;
  there was no way to ask your own question and get an inline answer.
- **Goal**: restore Curve's chat-style in-place Q&A under the article.
- **Key decision**: a pure presentational component; all state + streaming live
  in the store (`node.userQuestionTurns` + `askInReading`).
