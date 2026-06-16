// Center chat surface: message feed, pending indicator, composer, and the
// empty state for new chats. State comes from the store.
//
// Scroll policy (so a streamed reply reads from its start, not its end):
//  - sending a question pins THAT question near the top, so the reply streams
//    in below it and the user reads top-down — no jump to the bottom;
//  - while the reply streams, the feed is left alone (no auto-follow);
//  - opening an existing chat from history jumps to the latest message.
//
// Pagination: when the user scrolls near the top of a conversation that has
// older messages (hasMore), this view triggers loadOlderMessages and preserves
// the scroll offset so the viewport does not jump.
//
// Change history:
//   2026-06-15  Wired EmptyState starter chips → Composer via seedRef callback.
//   2026-06-15  Message pagination: scroll-to-top triggers load-older; scroll
//               offset is preserved by capturing scrollHeight before prepend and
//               restoring (newScrollHeight - oldScrollHeight + scrollTop) after.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MessageView } from './MessageView';
import { ThinkingIndicator } from './ThinkingIndicator';
import { Composer } from './Composer';
import { EmptyState } from './EmptyState';

/** Gap left above a pinned question so it is not flush against the top edge. */
const FEED_TOP_PAD = 12;

/**
 * How many pixels from the top of the feed scrollable area to trigger
 * loading older messages. A small value (e.g. 80px) means the user must
 * intentionally scroll near the top — it won't fire on every open.
 */
const LOAD_OLDER_THRESHOLD = 80;

export function ChatView() {
  const activeChatId = useAppStore((s) => s.activeChatId);
  const convos = useAppStore((s) => s.convos);
  const convoPagination = useAppStore((s) => s.convoPagination);
  const pending = useAppStore((s) => s.pending);
  const send = useAppStore((s) => s.send);
  const loadOlderMessages = useAppStore((s) => s.loadOlderMessages);

  // Starter chip seed: when the user clicks a chip in the EmptyState we
  // pass the prompt text down to the Composer via this state so the Composer
  // can fill its textarea and focus it.  We use state (not a store field) so
  // the Composer only picks up fresh seeds when it re-renders (not on mount).
  const [composerSeed, setComposerSeed] = useState<string | null>(null);
  const handleSeedComposer = useCallback((prompt: string) => {
    setComposerSeed(prompt);
  }, []);
  const clearComposerSeed = useCallback(() => setComposerSeed(null), []);

  const messages = (activeChatId && convos[activeChatId]) || [];
  const feedRef = useRef<HTMLDivElement>(null);

  // Pagination metadata for the active chat.
  const pagination = activeChatId ? convoPagination[activeChatId] : undefined;
  const hasMore = pagination?.hasMore ?? false;
  const loadingOlder = pagination?.loading ?? false;

  // Id of the last user message — changes exactly when a question is sent.
  const lastUserId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].id;
    }
    return undefined;
  }, [messages]);
  const lastRole = messages.length ? messages[messages.length - 1].role : undefined;

  const prevChatRef = useRef<string | null>(null);
  const prevUserRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const chatChanged = prevChatRef.current !== activeChatId;
    const userChanged = lastUserId !== prevUserRef.current;
    prevChatRef.current = activeChatId;
    prevUserRef.current = lastUserId;

    // A freshly sent question (last message is the user's, no reply yet): pin it
    // near the top so the answer streams in below and reads from the start.
    if (userChanged && lastUserId && lastRole === 'user') {
      const node = el.querySelector<HTMLElement>(`[data-msg-id="${lastUserId}"]`);
      if (node) {
        const top = node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
        el.scrollTop = Math.max(0, top - FEED_TOP_PAD);
        return;
      }
    }
    // Opening an existing chat from history: show the latest message.
    if (chatChanged) el.scrollTop = el.scrollHeight;
  }, [activeChatId, lastUserId, lastRole]);

  // Scroll offset preservation after prepend: capture scrollHeight before the
  // store update, then restore it after React re-renders.
  const prevScrollHeightRef = useRef<number | null>(null);

  // After a load-older result lands (messages grew at the front), restore the
  // scroll position so the viewport stays on the same message.
  //
  // WHY useLayoutEffect (not useEffect) with [messages.length, messages[0]?.id]:
  //   - useEffect runs *after* the browser paints, causing a visible jump.
  //   - useLayoutEffect runs synchronously after DOM mutations but before paint,
  //     so the scroll correction is applied before the user sees the new layout.
  //   - The deps [messages.length, messages[0]?.id] gate the correction to only
  //     when the front of the list actually changed (new messages prepended).
  //     The old no-deps variant fired on every render — including when the
  //     `.nb-load-older-indicator` appeared (~24 px height), which consumed
  //     prevScrollHeightRef early and left nothing for the real prepend render.
  const firstMsgId = messages[0]?.id;
  useLayoutEffect(() => {
    const el = feedRef.current;
    if (el && prevScrollHeightRef.current !== null) {
      const delta = el.scrollHeight - prevScrollHeightRef.current;
      if (delta > 0) {
        el.scrollTop = el.scrollTop + delta;
      }
      prevScrollHeightRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, firstMsgId]);

  // Scroll handler: when the user scrolls near the top, trigger load-older.
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (!activeChatId || !hasMore || loadingOlder) return;
      if (el.scrollTop <= LOAD_OLDER_THRESHOLD) {
        // Capture the current scrollHeight before the store prepends messages.
        prevScrollHeightRef.current = el.scrollHeight;
        void loadOlderMessages(activeChatId);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [activeChatId, hasMore, loadingOlder, loadOlderMessages]);

  if (!activeChatId || messages.length === 0) {
    return (
      <>
        <EmptyState onSeedComposer={handleSeedComposer} />
        <Composer onSend={send} chipSeed={composerSeed} onClearChipSeed={clearComposerSeed} />
      </>
    );
  }

  return (
    <>
      <div className="nb-feed" ref={feedRef} data-testid="chat-message-feed">
        {/* Subtle "loading older messages" affordance at the very top of the feed. */}
        {loadingOlder && (
          <div className="nb-load-older-indicator" aria-label="加载更早的消息" role="status">
            <span className="nb-load-older-dot" />
            <span className="nb-load-older-dot" />
            <span className="nb-load-older-dot" />
          </div>
        )}
        {messages.map((m) => (
          <MessageView key={m.id} m={m} />
        ))}
        {pending && <ThinkingIndicator />}
      </div>
      <Composer onSend={send} />
    </>
  );
}
