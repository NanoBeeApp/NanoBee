// Center chat surface: message feed (auto-scrolling), pending indicator,
// composer, and the empty state for new chats. State comes from the store.
import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { topicById } from '../../data/topics';
import { MessageView } from './MessageView';
import { ThinkingIndicator } from './ThinkingIndicator';
import { Composer } from './Composer';
import { EmptyState } from './EmptyState';

export function ChatView() {
  const activeChatId = useAppStore((s) => s.activeChatId);
  const activeTopicId = useAppStore((s) => s.activeTopicId);
  const convos = useAppStore((s) => s.convos);
  const pending = useAppStore((s) => s.pending);
  const send = useAppStore((s) => s.send);

  const messages = (activeChatId && convos[activeChatId]) || [];
  const topic = topicById(activeTopicId) ?? null;
  const feedRef = useRef<HTMLDivElement>(null);

  // Keep the feed pinned to the latest message.
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending, activeChatId]);

  if (!activeChatId || messages.length === 0) {
    return (
      <>
        <EmptyState onSend={send} />
        <Composer topic={topic} onSend={send} showQuick={false} />
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
      <Composer topic={topic} onSend={send} />
    </>
  );
}
