// Topic-group sidebar view: collapsible topic cards, each listing its
// conversations and tasks. Grouping is presented as AI-managed. Chats come
// from the store (server-loaded via bootstrap), not the static demo module.
import type { ChatMeta, Task } from '../../types';
import { TOPICS } from '../../data/topics';
import { Icons } from '../../icons/icons';

interface TopicGroupListProps {
  activeChatId: string | null;
  isChatView: boolean;
  openTopics: string[];
  chats: ChatMeta[];
  tasks: Task[];
  onSelectChat: (id: string) => void;
  onToggleTopic: (id: string) => void;
}

export function TopicGroupList({ activeChatId, isChatView, openTopics, chats: allChats, tasks, onSelectChat, onToggleTopic }: TopicGroupListProps) {
  return (
    <div style={{ paddingTop: 6 }}>
      <div className="nb-grp">话题 · NanoBee 自动归类</div>
      {TOPICS.map((t) => {
        const open = openTopics.includes(t.id);
        const chats = allChats.filter((c) => c.topicId === t.id);
        const topicTasks = tasks.filter((k) => k.topicId === t.id);
        return (
          <div key={t.id} className={`nb-topic${open ? ' open' : ''}`}>
            <div className="nb-topic-head" onClick={() => onToggleTopic(t.id)} data-testid={`topic-group-${t.id}`}>
              <span className="nb-topic-name">{t.name}</span>
              <span className="nb-topic-count">{chats.length}·{topicTasks.length}</span>
              <span className="nb-topic-chev"><Icons.chevR size={15} /></span>
            </div>
            {open && (
              <div className="nb-topic-body">
                {chats.map((c) => (
                  <div key={c.id}
                    className={`nb-sub-item${isChatView && activeChatId === c.id ? ' active' : ''}`}
                    onClick={() => onSelectChat(c.id)} data-testid={`topic-chat-item-${c.id}`}>
                    <span className="nb-sub-label">{c.title}</span>
                  </div>
                ))}
                {topicTasks.map((k) => (
                  <div key={k.id} className="nb-sub-item task" data-testid={`topic-task-item-${k.id}`}>
                    <span className="nb-sub-label">{k.title}</span>
                    {k.status === 'paused'
                      ? <span className="badge badge-neutral" style={{ fontSize: 9, padding: '1px 5px' }}>暂停</span>
                      : <span className="dot dot-success" style={{ color: 'var(--success)' }} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
