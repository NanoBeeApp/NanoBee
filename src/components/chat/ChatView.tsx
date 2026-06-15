// Center chat surface: message feed, pending indicator, composer, and the
// empty state for new chats. State comes from the store.
//
// Scroll policy (so a streamed reply reads from its start, not its end):
//  - sending a question pins THAT question near the top, so the reply streams
//    in below it and the user reads top-down — no jump to the bottom;
//  - while the reply streams, the feed is left alone (no auto-follow);
//  - opening an existing chat from history jumps to the latest message.
//
// Change history:
//   2026-06-15  Wired EmptyState starter chips → Composer via seedRef callback.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MessageView } from './MessageView';
import { ThinkingIndicator } from './ThinkingIndicator';
import { Composer } from './Composer';
import { EmptyState } from './EmptyState';

/** Gap left above a pinned question so it is not flush against the top edge. */
const FEED_TOP_PAD = 12;

export function ChatView() {
  const activeChatId = useAppStore((s) => s.activeChatId);
  const convos = useAppStore((s) => s.convos);
  const pending = useAppStore((s) => s.pending);
  const send = useAppStore((s) => s.send);

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
        {messages.map((m) => (
          <MessageView key={m.id} m={m} />
        ))}
        {pending && <ThinkingIndicator />}
      </div>
      <Composer onSend={send} />
    </>
  );
}
