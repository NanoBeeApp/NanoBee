// Quick-chat assistant — present on every non-chat surface (today / tasks /
// artifacts / research). It docks as a right sidebar (a real grid column on the
// today/tasks/artifacts surfaces; a fixed overlay that floats over the
// position-stable research canvas). The sidebar is collapsible: when open it
// stacks (top→bottom) a minimal floating control cluster (no header bar),
// an optional context chip, the message feed and the composer; when collapsed
// only a small re-open button stays in the top-right corner — the same fixed
// spot as the open-state collapse chevron, so the toggle never moves. Context-aware
// ("正在看 · …" chip) and can promote the conversation to the full chat page.
import { useEffect, useRef, useState } from 'react';
import { useAppStore, VIEW_CONTEXT } from '../../store/useAppStore';
import { useImeComposition } from '../../lib/useImeComposition';
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
  // IME-composition guard shared with the other composers. `composingRef` feeds
  // the window-level keydown listener below (which sees raw native events), and
  // `isSubmitEnter` / `compositionProps` drive the textarea.
  const { composingRef, compositionProps, isSubmitEnter } = useImeComposition();

  const messages = (quickChatId && convos[quickChatId]) || [];
  const hasMessages = messages.length > 0;
  const open = !rightCollapsed;
  // The chat page has its own full-width composer, and the settings page is a
  // configuration surface — neither shows the quick-chat sidebar. Keep this in
  // sync with the shell's `with-rightchat` grid column (see _app.tsx).
  const hidden = view === 'chat' || view === 'settings';

  // Keep the feed pinned to the latest message / pending indicator — and to the
  // bottom whenever the sidebar is (re)opened.
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending, open]);

  // Keyboard control for the sidebar. Inert on the chat / settings surfaces
  // where the widget isn't rendered.
  // - ⌘J / Ctrl+J toggles it from anywhere (preventDefault so the browser's own
  //   ⌘J / downloads stays out of the way while the app owns it).
  // - Escape collapses it when open (matches the standard "dismiss overlay" gesture).
  useEffect(() => {
    if (hidden) return;
    const onKey = (e: KeyboardEvent) => {
      // Ignore keys delivered while an IME composition is active (Chinese /
      // Japanese / Korean input). There, the first Esc cancels the in-progress
      // composition — it must NOT also collapse the sidebar. We trust our own
      // composition ref first, with isComposing / keyCode 229 as a fallback.
      if (composingRef.current || e.isComposing || e.keyCode === 229) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setRightCollapsed(!rightCollapsed);
      } else if (e.key === 'Escape' && !rightCollapsed) {
        e.preventDefault();
        setRightCollapsed(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hidden, rightCollapsed, setRightCollapsed]);

  // Drop the cursor straight into the composer whenever the sidebar opens, so the
  // shortcut (or a tab click) leaves the user ready to type.
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
    if (isSubmitEnter(e)) { e.preventDefault(); submit(); }
  };
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setVal(e.target.value);
    const ta = taRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
    }
  };

  // Collapsed: a small re-open button pinned to the top-right corner — the same
  // fixed spot as the open-state collapse chevron, so the toggle stays put.
  if (!open) {
    return (
      <button
        className="nb-rc-reopen"
        onClick={() => setRightCollapsed(false)}
        title="展开快速对话 · ⌘J"
        aria-label="展开快速对话（⌘J）"
        aria-expanded={false}
        data-testid="expand-right-chat">
        <Icons.panelRight size={17} />
      </button>
    );
  }

  // The chip always tells the user what NanoBee can see: the page is the
  // always-present baseline (derived from the active route, so it's never
  // stale), and the in-view article — when one is reported (Today) — is the
  // more specific focus that takes precedence.
  const pageCtx = VIEW_CONTEXT[view];
  const itemLabel = ctx
    ? (ctx.title.length > CTX_LABEL_MAX_CHARS ? `${ctx.title.slice(0, CTX_LABEL_MAX_CHARS)}…` : ctx.title)
    : null;
  const ctxLabel = itemLabel ?? pageCtx?.label ?? null;

  return (
    <aside className="nb-rightchat" data-testid="right-chat-panel">
      {/* Top bar — no header chrome: the "正在看 · …" context chip sits on the
          left, sharing one row with the minimal control cluster on the right
          (the collapse chevron, plus the "open in full chat" handoff once there
          are messages). The chip is optional; the controls stay pinned right. */}
      <div className="nb-rc-top">
        {ctxLabel && (
          <span className="nb-chip" style={{ borderColor: 'var(--nb-amber-line)', background: 'var(--nb-amber-soft)', color: 'var(--nb-amber-ink)', fontFamily: 'var(--font-sans)' }}
            title="NanoBee 能读取你当前查看的内容，作为这段对话的上下文"
            data-testid="viewing-context-chip">
            <span className="ic"><Icons.eye size={12} /></span>
            正在看 · {ctxLabel}
            {ctx && (
              <span style={{ cursor: 'pointer', opacity: 0.6, display: 'inline-flex', marginLeft: 2 }}
                title="取消关联这条内容"
                onClick={() => setQuickCtx(null)} data-testid="clear-viewing-context"><Icons.x size={11} /></span>
            )}
          </span>
        )}
        <div className="nb-rc-tools">
          {hasMessages && (
            <button className="btn btn-ghost btn-icon btn-sm" title="在聊天页打开" onClick={openQuickInChat}
              data-testid="open-quick-chat-in-full">
              <Icons.arrowRight size={15} />
            </button>
          )}
          <button className="btn btn-ghost btn-icon btn-sm" title="收起 · ⌘J / Esc" onClick={() => setRightCollapsed(true)}
            data-testid="collapse-right-chat" aria-label="收起快速对话">
            <Icons.panelRight size={17} />
          </button>
        </div>
      </div>

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
              {...compositionProps}
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
