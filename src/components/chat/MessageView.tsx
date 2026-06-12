// Renders one chat message: user bubble, AI reply, or proactive amber card.
// Proactive messages are AI-initiated and visually distinguished (the design's
// confirmed default is the emphasized card style).
import type { ChatMessage, TaskSuggestion } from '../../types';
import { Icon, Icons } from '../../icons/icons';
import { InlineSegments } from './InlineSegments';
import { PriceCard } from './PriceCard';
import { RecommendedActions } from './RecommendedActions';
import { TaskSuggestCard } from './TaskSuggestCard';

interface MessageViewProps {
  m: ChatMessage;
  createdTaskIds: string[];
  onCreateTask: (d: TaskSuggestion) => void;
  onSuggest: (text: string) => void;
}

export function MessageView({ m, createdTaskIds, onCreateTask, onSuggest }: MessageViewProps) {
  if (m.role === 'user') {
    return (
      <div className="nb-msg nb-user" data-testid="chat-user-message">
        <div className="bubble">{m.text}</div>
      </div>
    );
  }

  const isProactive = m.role === 'proactive';
  const body = (
    <>
      {m.thinking && (
        <div className="nb-thinking" style={{ marginBottom: 12 }}>
          <Icons.spark size={13} /> <span>{m.thinking}</span>
        </div>
      )}
      <div className="nb-body nb-selectable" data-ai-text="1">
        {m.paras.map((p, i) => <p key={i}><InlineSegments segs={p} /></p>)}
      </div>
      {(m.extras ?? []).map((ex, i) => {
        if (ex.kind === 'price') return <PriceCard key={i} d={ex.data} />;
        if (ex.kind === 'rec') return <RecommendedActions key={i} items={ex.data} />;
        return (
          <TaskSuggestCard key={i} d={ex.data}
            created={createdTaskIds.includes(ex.data.id)} onCreate={onCreateTask} />
        );
      })}
      {m.citations && (
        <div className="nb-cite-row">
          {m.citations.map((c, i) => <span className="src" key={i}><span className="n">{i + 1}</span> {c}</span>)}
        </div>
      )}
      {m.suggest && (
        <div className="nb-suggest" data-testid="reply-suggestion-chips">
          {m.suggest.map((s, i) => <button key={i} onClick={() => onSuggest(s)}>{s}</button>)}
        </div>
      )}
    </>
  );

  if (isProactive) {
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
