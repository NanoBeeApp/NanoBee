// In-place Q&A turns rendered below a node's article (ported from Curve's
// UserQuestionTurns). The reader's own custom follow-up questions are answered
// inline (chat-style) instead of growing a new child node, so the back-and-forth
// stays attached to the article it was asked about.

import { Markdown } from "../common/Markdown";
import type { ResearchQnaTurn } from "../../research/types";

interface ReadingQnaTurnsProps {
  turns: ResearchQnaTurn[];
}

export function ReadingQnaTurns({ turns }: ReadingQnaTurnsProps) {
  if (turns.length === 0) return null;
  return (
    <div className="rc-qna" data-testid="research-qna-turns">
      <div className="rc-followups-label">我的追问</div>
      {turns.map((turn) => {
        const streaming = turn.status === "loading";
        const failed = turn.status === "failed";
        return (
          <div className="rc-qna-turn" key={turn.id} data-testid="research-qna-turn">
            <div className="rc-qna-question">{turn.question}</div>
            <div className="rc-qna-answer">
              {/* No answer text yet → thinking; once tokens arrive show them. */}
              {streaming && !turn.answer && (
                <div className="rc-reading-loading">
                  <span className="rc-node-spinner" />
                  AI 正在回答…
                </div>
              )}
              {failed && <p className="rc-qna-failed">这次回答失败了，请再试一次。</p>}
              {turn.answer && (
                <Markdown
                  className="rc-prose"
                  content={turn.answer}
                  streaming={streaming}
                />
              )}
              {streaming && turn.answer && (
                <div className="rc-reading-streaming" aria-live="polite">
                  <span className="rc-stream-cursor" />
                  正在生成…
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
