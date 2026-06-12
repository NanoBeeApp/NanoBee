// Center chat surface: message feed (auto-scrolling), pending indicator,
// composer, and the empty state for new chats. State comes from the store.
import { useEffect, useMemo, useRef } from 'react';
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
  const createdTaskIds = useAppStore((s) => s.createdTaskIds);
  const tasks = useAppStore((s) => s.tasks);
  const send = useAppStore((s) => s.send);
  const createTask = useAppStore((s) => s.createTask);

  // A suggestion counts as created when confirmed this session or already
  // persisted in the task list (e.g. confirmed before a reload).
  const knownTaskIds = useMemo(
    () => [...createdTaskIds, ...tasks.map((t) => t.id)],
    [createdTaskIds, tasks],
  );

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
        <Composer topic={topic} onSend={send} />
      </>
    );
  }

  return (
    <>
      <div className="nb-feed" ref={feedRef} data-testid="chat-message-feed">
        {messages.map((m) => (
          <MessageView key={m.id} m={m} createdTaskIds={knownTaskIds}
            onCreateTask={createTask} onSuggest={send} />
        ))}
        {pending && <ThinkingIndicator />}
      </div>
      <Composer topic={topic} onSend={send} />
    </>
  );
}
