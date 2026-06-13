// Docked right-hand chat panel — present on every non-chat surface (today /
// tasks / artifacts / research). It holds the message feed (top) and the
// composer (bottom) so the user can chat from any page, while the full-width
// centered composer stays exclusive to the chat page. Context-aware
// ("正在看 · …" chip) and can promote the conversation to the full chat page.
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import { MessageView } from '../chat/MessageView';
import { ThinkingIndicator } from '../chat/ThinkingIndicator';

const TEXTAREA_MAX_HEIGHT = 120;
const CTX_LABEL_MAX_CHARS = 18;

export function QuickChat() {
  const view = useAppStore((s) => s.view);
  const ctx = useAppStore((s) => s.quickCtx);
  const setQuickCtx = useAppStore((s) => s.setQuickCtx);
  const quickChatId = useAppStore((s) => s.quickChatId);
  const convos = useAppStore((s) => s.convos);
  const pending = useAppStore((s) => s.quickPending);
  const sendQuick = useAppStore((s) => s.sendQuick);
  const openQuickInChat = useAppStore((s) => s.openQuickInChat);
  const setRightCollapsed = useAppStore((s) => s.setRightCollapsed);

  const [val, setVal] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const messages = (quickChatId && convos[quickChatId]) || [];
  const hasMessages = messages.length > 0;

  // Keep the feed pinned to the latest message / pending indicator.
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending]);

  // The chat page has its own full-width composer, and the settings page is a
  // configuration surface — neither shows the docked quick-chat panel.
  if (view === 'chat' || view === 'settings') return null;

  const submit = () => {
    if (!val.trim()) return;
    sendQuick(val.trim());
    setVal('');
    if (taRef.current) {
      taRef.current.style.height = 'auto';
      // Keep focus in the input after clicking the send button.
      taRef.current.focus();
    }
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setVal(e.target.value);
    const ta = taRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
    }
  };

  const ctxLabel = ctx
    ? (ctx.title.length > CTX_LABEL_MAX_CHARS ? `${ctx.title.slice(0, CTX_LABEL_MAX_CHARS)}…` : ctx.title)
    : null;

  return (
    <aside className="nb-rightchat" data-testid="right-chat-panel">
      <div className="nb-rc-head">
        <span className="nb-rc-glyph"><Icons.bee size={14} sw={1.6} /></span>
        <b>快速对话</b>
        <span style={{ flex: 1 }} />
        {hasMessages && (
          <button className="btn btn-ghost btn-icon btn-sm" title="在聊天页打开" onClick={openQuickInChat}
            data-testid="open-quick-chat-in-full">
            <Icons.arrowRight size={15} />
          </button>
        )}
        <button className="btn btn-ghost btn-icon btn-sm" title="收起面板" onClick={() => setRightCollapsed(true)}
          data-testid="collapse-right-chat">
          <Icons.panelRight size={15} />
        </button>
      </div>

      {ctx && (
        <div className="nb-rc-ctx">
          <span className="nb-chip" style={{ borderColor: 'var(--nb-amber-line)', background: 'var(--nb-amber-soft)', color: 'var(--nb-amber-ink)', fontFamily: 'var(--font-sans)' }}
            data-testid="viewing-context-chip">
            <span className="ic"><Icons.eye size={12} /></span>
            正在看 · {ctxLabel}
            <span style={{ cursor: 'pointer', opacity: 0.6, display: 'inline-flex', marginLeft: 2 }}
              onClick={() => setQuickCtx(null)} data-testid="clear-viewing-context"><Icons.x size={11} /></span>
          </span>
        </div>
      )}

      <div className="nb-rc-feed" ref={feedRef} data-testid="quick-chat-feed">
        {hasMessages ? (
          <>
            {messages.map((m) => (
              <MessageView key={m.id} m={m} />
            ))}
            {pending && <div className="nb-rc-thinking"><ThinkingIndicator /></div>}
          </>
        ) : (
          <div className="nb-rc-empty" data-testid="quick-chat-empty">
            <span className="nb-rc-empty-glyph"><Icons.bee size={20} sw={1.6} /></span>
            <p>随时问我，或让我帮你盯着一件事</p>
          </div>
        )}
      </div>

      <div className="nb-rc-composer">
        <div className="nb-qc">
          <div className="qc-row">
            <textarea ref={taRef} rows={1} value={val} onChange={onChange} onKeyDown={onKeyDown}
              placeholder={ctx ? '问问这条内容…' : '随时问我…'}
              data-testid="quick-chat-input" />
            <button className="nb-send" disabled={!val.trim()} onClick={submit} title="发送"
              data-testid="send-quick-chat"><Icons.send size={15} sw={2.4} /></button>
          </div>
        </div>
      </div>
    </aside>
  );
}
