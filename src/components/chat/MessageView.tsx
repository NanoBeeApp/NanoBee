// Renders one chat message: user bubble, AI reply, or proactive amber card.
// Kept intentionally minimal: just the message text (no status pills, task
// cards, citation chips or reply suggestions).
import type { ChatMessage } from '../../types';
import { Icon, Icons } from '../../icons/icons';
import { InlineSegments } from './InlineSegments';

interface MessageViewProps {
  m: ChatMessage;
}

export function MessageView({ m }: MessageViewProps) {
  if (m.role === 'user') {
    return (
      <div className="nb-msg nb-user" data-testid="chat-user-message">
        <div className="bubble">{m.text}</div>
      </div>
    );
  }

  const body = (
    <div className="nb-body nb-selectable" data-ai-text="1">
      {m.paras.map((p, i) => <p key={i}><InlineSegments segs={p} /></p>)}
    </div>
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
      </div>
      {body}
    </div>
  );
}
