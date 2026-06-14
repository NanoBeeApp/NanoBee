// Customer-service-style quick-chat widget — present on every non-chat surface
// (today / tasks / artifacts / research). A floating launcher bubble sits at the
// bottom-right; it is folded by default (only the bubble shows). Clicking the
// bubble opens a popup chat panel above it, which stays open until the bubble
// (or the popup's close button) is clicked again. The panel holds the message
// feed (top) and composer (bottom); the full-width centered composer stays
// exclusive to the chat page. Context-aware ("正在看 · …" chip) and can promote
// the conversation to the full chat page.
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import { MessageView } from '../chat/MessageView';
import { ThinkingIndicator } from '../chat/ThinkingIndicator';
import '../../styles/quickchat.css';

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
  const rightCollapsed = useAppStore((s) => s.rightCollapsed);
  const setRightCollapsed = useAppStore((s) => s.setRightCollapsed);

  const [val, setVal] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  // True while an IME composition is in progress (pinyin / kana / hangul). We
  // track it ourselves via composition events because `KeyboardEvent.isComposing`
  // is unreliable for Escape across browsers — and keydown fires before
  // `compositionend`, so this ref is still true at the moment we check it.
  const composingRef = useRef(false);

  const messages = (quickChatId && convos[quickChatId]) || [];
  const hasMessages = messages.length > 0;
  const open = !rightCollapsed;
  // The chat page has its own full-width composer, and the settings page is a
  // configuration surface — neither shows the quick-chat widget.
  const hidden = view === 'chat' || view === 'settings';

  // Keep the feed pinned to the latest message / pending indicator — and to the
  // bottom whenever the popup is (re)opened.
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending, open]);

  // Keyboard control for the popup. Inert on the chat / settings surfaces where
  // the widget isn't rendered.
  // - Space opens it — but ONLY when nothing interactive is focused (so it never
  //   steals a space from a text field, a focused button/link, or a scrollable
  //   region). The app body is overflow:hidden, so a bare Space here has no
  //   page-scroll job to hijack.
  // - Escape closes it when open (the standard "dismiss overlay" gesture).
  useEffect(() => {
    if (hidden) return;
    const onKey = (e: KeyboardEvent) => {
      // Ignore keys delivered while an IME composition is active (Chinese /
      // Japanese / Korean input). There, the first Esc cancels the in-progress
      // composition — it must NOT also close the popup. We trust our own
      // composition ref first, with isComposing / keyCode 229 as a fallback.
      if (composingRef.current || e.isComposing || e.keyCode === 229) return;

      if (e.key === 'Escape' && !rightCollapsed) {
        e.preventDefault();
        setRightCollapsed(true);
        return;
      }

      // Space opens the popup, but only in a "non-input" state: it is folded, no
      // modifier is held, and the focus is on the bare page (document.body) — not
      // an <input>/<textarea>/contenteditable, nor a focused button/link/control.
      if (
        (e.key === ' ' || e.code === 'Space') &&
        rightCollapsed &&
        !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey
      ) {
        const active = document.activeElement;
        if (active && active !== document.body) return;
        e.preventDefault();
        setRightCollapsed(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hidden, rightCollapsed, setRightCollapsed]);

  // Drop the cursor straight into the composer whenever the popup opens, so the
  // shortcut (or a bubble click) leaves the user ready to type.
  useEffect(() => {
    if (open) taRef.current?.focus();
  }, [open]);

  if (hidden) return null;

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
    // Don't send while composing — Enter there confirms the IME candidate, not
    // the message (otherwise picking a Chinese word would fire a premature send).
    if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) { e.preventDefault(); submit(); }
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
      {open && (
        <aside className="nb-qc-pop" data-testid="right-chat-panel">
          <div className="nb-rc-head">
            <span className="nb-rc-glyph"><Icons.bee size={14} sw={1.6} /></span>
            <b>快速对话</b>
            <span className="kbd" title="非输入状态下按空格可打开">空格</span>
            <span style={{ flex: 1 }} />
            {hasMessages && (
              <button className="btn btn-ghost btn-icon btn-sm" title="在聊天页打开" onClick={openQuickInChat}
                data-testid="open-quick-chat-in-full">
                <Icons.arrowRight size={15} />
              </button>
            )}
            <button className="btn btn-ghost btn-icon btn-sm" title="关闭 · Esc" onClick={() => setRightCollapsed(true)}
              data-testid="collapse-right-chat">
              <Icons.x size={15} />
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
                  onCompositionStart={() => { composingRef.current = true; }}
                  onCompositionEnd={() => { composingRef.current = false; }}
                  placeholder={ctx ? '问问这条内容…' : '随时问我…'}
                  data-testid="quick-chat-input" />
                <button className="nb-send" disabled={!val.trim()} onClick={submit} title="发送"
                  data-testid="send-quick-chat"><Icons.send size={15} sw={2.4} /></button>
              </div>
            </div>
          </div>
        </aside>
      )}

      <button
        className={`nb-qc-bubble${open ? ' is-open' : ''}`}
        onClick={() => setRightCollapsed(open)}
        title={open ? '关闭快速对话' : '快速对话（非输入状态下按空格打开）'}
        aria-label={open ? '关闭快速对话' : '打开快速对话（空格）'}
        aria-expanded={open}
        data-testid="quick-chat-bubble">
        {open ? <Icons.x size={22} sw={2.2} /> : <Icons.bee size={24} sw={1.6} />}
      </button>
    </>
  );
}
