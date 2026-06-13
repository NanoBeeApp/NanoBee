// Renders one chat message: user bubble, AI reply, or proactive amber card.
// AI replies that carry an agent execution trace get a small debug entry
// that opens AgentTraceModal. Otherwise kept intentionally minimal: just
// the message text (no status pills, task cards, citation chips).
import { useState } from 'react';
import type { ChatMessage } from '../../types';
import type { TracedAiMessage } from '../../lib/agent-trace';
import { Icon, Icons } from '../../icons/icons';
import { AgentTraceModal } from './AgentTraceModal';
import { Markdown } from '../common/Markdown';
import { parasToMarkdown } from '../../lib/paras-to-markdown';
import { ArtifactRefCard } from './ArtifactRefCard';

interface MessageViewProps {
  m: ChatMessage;
}

export function MessageView({ m }: MessageViewProps) {
  // UI-only toggle for the trace debug modal (AI messages with a trace).
  const [traceOpen, setTraceOpen] = useState(false);

  if (m.role === 'user') {
    return (
      <div className="nb-msg nb-user" data-testid="chat-user-message">
        <div className="bubble">{m.text}</div>
      </div>
    );
  }

  const trace = (m as TracedAiMessage).trace;

  // AI replies are markdown: prefer the raw `md` (LLM output); otherwise
  // serialize the legacy structured paragraphs. One render path via <Markdown>.
  const body = (
    <Markdown
      className="nb-body nb-selectable"
      data-ai-text="1"
      content={m.md ?? parasToMarkdown(m.paras)}
    />
  );

  if (m.role === 'proactive') {
    return (
      <div className="nb-proactive" data-testid="proactive-push-card">
        <div className="nb-pro-card">
          <div className="nb-pro-head">
            <div className="pico"><Icon name={m.icon ?? 'bell'} size={15} /></div>
            <div>
              <span className="nb-pro-tag"><Icons.bee size={11} sw={1.6} /> NanoBee 主动推送</span>
              <div className="ptitle" style={{ marginTop: 4 }}>{m.title}</div>
            </div>
            <span className="ptime">{m.time}</span>
          </div>
          <div className="nb-pro-body">{body}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="nb-msg" data-testid="chat-assistant-message">
      <div className="nb-role">
        <span className="av ai"><Icons.bee size={13} sw={1.6} /></span> NanoBee
        {trace && (
          <button
            type="button"
            className="nb-trace-open"
            onClick={() => setTraceOpen(true)}
            title="查看 Agent 执行过程"
            data-testid="agent-trace-open-button"
          >
            <Icons.bolt size={11} />
            执行过程
          </button>
        )}
      </div>
      {body}
      {m.artifacts && m.artifacts.length > 0 && <ArtifactRefCard refs={m.artifacts} />}
      {trace && traceOpen && (
        <AgentTraceModal trace={trace} onClose={() => setTraceOpen(false)} />
      )}
    </div>
  );
}
