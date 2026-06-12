// ChatGPT-style flat chat history, time-grouped, with session ("刚刚") chats
// created during this visit shown on top. Chats come from the store
// (server-loaded via bootstrap), not from the static demo module.
import type { ChatMeta, SessionMeta } from '../../types';
import { CHAT_HISTORY_GROUPS } from '../../data/chats';

interface ChatHistoryListProps {
  activeChatId: string | null;
  isChatView: boolean;
  chats: ChatMeta[];
  sessions: SessionMeta[];
  onSelectChat: (id: string) => void;
}

export function ChatHistoryList({ activeChatId, isChatView, chats, sessions, onSelectChat }: ChatHistoryListProps) {
  // Chats created in past sessions also land in "今天" after a reload.
  const sessionIds = new Set(sessions.map((s) => s.id));
  return (
    <>
      {sessions.length > 0 && (
        <div>
          <div className="nb-grp">刚刚</div>
          {sessions.slice().reverse().map((s) => {
            return (
              <div key={s.id}
                className={`nb-item${isChatView && activeChatId === s.id ? ' active' : ''}`}
                onClick={() => onSelectChat(s.id)} data-testid={`chat-history-item-${s.id}`}>
                <div className="meta">
                  <div className="title">{s.title}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {CHAT_HISTORY_GROUPS.map((g) => {
        const items = chats.filter((c) => c.group === g && !sessionIds.has(c.id));
        if (!items.length) return null;
        return (
          <div key={g}>
            <div className="nb-grp">{g}</div>
            {items.map((c) => {
              return (
                <div key={c.id}
                  className={`nb-item${isChatView && activeChatId === c.id ? ' active' : ''}`}
                  onClick={() => onSelectChat(c.id)} data-testid={`chat-history-item-${c.id}`}>
                  <div className="meta">
                    <div className="title">{c.title}</div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
