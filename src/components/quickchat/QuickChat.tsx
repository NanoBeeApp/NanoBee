// Global floating composer + slide-up quick-chat overlay. Lives on every
// non-chat surface; context-aware ("正在看 · …" chip) and can hand the
// conversation off to the full chat page.
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const open = useAppStore((s) => s.quickOpen);
  const setOpen = useAppStore((s) => s.setQuickOpen);
  const quickChatId = useAppStore((s) => s.quickChatId);
  const convos = useAppStore((s) => s.convos);
  const pending = useAppStore((s) => s.quickPending);
  const sendQuick = useAppStore((s) => s.sendQuick);
  const openQuickInChat = useAppStore((s) => s.openQuickInChat);
  const createdTaskIds = useAppStore((s) => s.createdTaskIds);
  const tasks = useAppStore((s) => s.tasks);
  const createTask = useAppStore((s) => s.createTask);

  // A suggestion counts as created when confirmed this session or already
  // persisted in the task list (e.g. confirmed before a reload).
  const knownTaskIds = useMemo(
    () => [...createdTaskIds, ...tasks.map((t) => t.id)],
    [createdTaskIds, tasks],
  );

  const [val, setVal] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const messages = (quickChatId && convos[quickChatId]) || [];

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending, open]);

  // The chat page has its own full composer — the quick chat appears everywhere else.
  if (view === 'chat') return null;

  const submit = () => {
    if (!val.trim()) return;
    sendQuick(val.trim());
    setVal('');
    if (taRef.current) taRef.current.style.height = 'auto';
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
    <>
      {open && (messages.length > 0 || pending) && (
        <div className="nb-quick-pop" data-testid="quick-chat-overlay">
          <div className="qp-head">
            <span className="qp-glyph"><Icons.bee size={14} sw={1.6} /></span>
            <b>快速对话</b>
            {ctxLabel && (
              <span className="badge" style={{ background: 'var(--nb-amber-soft)', color: 'var(--nb-amber-ink)', border: 'none' }}>
                正在看 · {ctxLabel}
              </span>
            )}
            <span style={{ flex: 1 }} />
            <button className="btn btn-secondary btn-sm" style={{ gap: 6 }} onClick={openQuickInChat}
              data-testid="open-quick-chat-in-full">
              <Icons.chat size={13} /> 在聊天页打开
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" title="收起" onClick={() => setOpen(false)}
              data-testid="collapse-quick-chat">
              <Icons.chevD size={15} />
            </button>
          </div>
          <div className="qp-feed" ref={feedRef} data-testid="quick-chat-feed">
            {messages.map((m) => (
              <MessageView key={m.id} m={m} createdTaskIds={knownTaskIds}
                onCreateTask={createTask} onSuggest={sendQuick} />
            ))}
            {pending && <ThinkingIndicator />}
          </div>
        </div>
      )}

      <div className="nb-qc-wrap" data-testid="global-quick-composer">
        <div className="nb-qc">
          {ctx && (
            <div className="nb-qc-ctx">
              <span className="nb-chip" style={{ borderColor: 'var(--nb-amber-line)', background: 'var(--nb-amber-soft)', color: 'var(--nb-amber-ink)', fontFamily: 'var(--font-sans)' }}
                data-testid="viewing-context-chip">
                <span className="ic"><Icons.eye size={12} /></span>
                正在看 · {ctxLabel}
                <span style={{ cursor: 'pointer', opacity: 0.6, display: 'inline-flex', marginLeft: 2 }}
                  onClick={() => setQuickCtx(null)} data-testid="clear-viewing-context"><Icons.x size={11} /></span>
              </span>
            </div>
          )}
          <div className="qc-row">
            {messages.length > 0 && !open && (
              <button className="cbtn" title="展开对话" onClick={() => setOpen(true)} data-testid="expand-quick-chat">
                <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><Icons.chevD size={16} /></span>
              </button>
            )}
            <textarea ref={taRef} rows={1} value={val} onChange={onChange} onKeyDown={onKeyDown}
              placeholder={ctx ? '问问这条内容，或随时让我盯着一件事…' : '随时问我，或让我帮你盯着一件事…'}
              data-testid="quick-chat-input" />
            <button className="nb-send" disabled={!val.trim()} onClick={submit} title="发送"
              data-testid="send-quick-chat"><Icons.send size={15} sw={2.4} /></button>
          </div>
        </div>
      </div>
    </>
  );
}
