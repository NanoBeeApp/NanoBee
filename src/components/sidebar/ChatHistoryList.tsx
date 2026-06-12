// ChatGPT-style flat chat history, time-grouped, with session ("刚刚") chats
// created during this visit shown on top.
import type { SessionMeta } from '../../types';
import { CHATS, CHAT_HISTORY_GROUPS } from '../../data/chats';
import { TOPICS, topicById } from '../../data/topics';
import { Icons } from '../../icons/icons';

interface ChatHistoryListProps {
  activeChatId: string | null;
  isChatView: boolean;
  sessions: SessionMeta[];
  onSelectChat: (id: string) => void;
}

export function ChatHistoryList({ activeChatId, isChatView, sessions, onSelectChat }: ChatHistoryListProps) {
  return (
    <>
      {sessions.length > 0 && (
        <div>
          <div className="nb-grp">刚刚</div>
          {sessions.slice().reverse().map((s) => {
            const t = topicById(s.topicId) ?? TOPICS[0];
            return (
              <div key={s.id}
                className={`nb-item${isChatView && activeChatId === s.id ? ' active' : ''}`}
                onClick={() => onSelectChat(s.id)} data-testid={`chat-history-item-${s.id}`}>
                <span className="tdot" style={{ background: t.color }} />
                <div className="meta">
                  <div className="title">{s.title}</div>
                  <div className="sub">快速对话</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {CHAT_HISTORY_GROUPS.map((g) => {
        const items = CHATS.filter((c) => c.group === g);
        if (!items.length) return null;
        return (
          <div key={g}>
            <div className="nb-grp">{g}</div>
            {items.map((c) => {
              const t = topicById(c.topicId);
              return (
                <div key={c.id}
                  className={`nb-item${isChatView && activeChatId === c.id ? ' active' : ''}`}
                  onClick={() => onSelectChat(c.id)} data-testid={`chat-history-item-${c.id}`}>
                  {c.pinned
                    ? <span className="star"><Icons.star size={12} /></span>
                    : <span className="tdot" style={{ background: t?.color }} />}
                  <div className="meta">
                    <div className="title">{c.title}</div>
                    <div className="sub">{c.sub}</div>
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
