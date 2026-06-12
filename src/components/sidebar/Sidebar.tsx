// Left rail: brand, new-chat button, "今日事项" inbox entry with unread count,
// and the history/topics view switch. Hidden entirely on the Today page.
import { useAppStore, selectUnreadCount } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import { AccountFoot } from './AccountFoot';
import { ChatHistoryList } from './ChatHistoryList';
import { TopicGroupList } from './TopicGroupList';

export function Sidebar() {
  const view = useAppStore((s) => s.view);
  const sidebarMode = useAppStore((s) => s.sidebarMode);
  const setSidebarMode = useAppStore((s) => s.setSidebarMode);
  const activeChatId = useAppStore((s) => s.activeChatId);
  const chats = useAppStore((s) => s.chats);
  const sessionMeta = useAppStore((s) => s.sessionMeta);
  const openTopics = useAppStore((s) => s.openTopics);
  const tasks = useAppStore((s) => s.tasks);
  const unreadCount = useAppStore(selectUnreadCount);
  const selectChat = useAppStore((s) => s.selectChat);
  const newChat = useAppStore((s) => s.newChat);
  const openToday = useAppStore((s) => s.openToday);
  const toggleTopic = useAppStore((s) => s.toggleTopic);
  const setSideCollapsed = useAppStore((s) => s.setSideCollapsed);

  const isChatView = view === 'chat';

  return (
    <aside className="nb-side" data-testid="app-sidebar">
      <div className="nb-side-top">
        <div className="nb-brand">
          <div className="glyph">
            <Icons.bee size={18} sw={1.6} style={{ color: '#fff' }} />
          </div>
          <div>
            <div className="name">Nano<b>Bee</b></div>
            <div className="sub">主动找你的 AI 助理</div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto', color: 'var(--ink-4)' }}
            title="收起边栏" onClick={() => setSideCollapsed(true)} data-testid="collapse-sidebar">
            <Icons.panelLeft size={15} />
          </button>
        </div>

        <button className="nb-newchat" onClick={newChat} data-testid="new-chat-button">
          <Icons.plus size={15} />
          新对话
          <span className="kbd">⌘N</span>
        </button>

        <button className={`nb-inbox-entry${view === 'today' ? ' active' : ''}`} onClick={openToday}
          data-testid="today-inbox-entry">
          <Icons.news size={15} />
          今日事项
          {unreadCount > 0 && <span className="count" data-testid="today-unread-count">{unreadCount}</span>}
        </button>

        <div className="nb-switch" data-testid="sidebar-view-switch">
          <button className={sidebarMode === 'history' ? 'active' : ''} onClick={() => setSidebarMode('history')}>聊天记录</button>
          <button className={sidebarMode === 'topics' ? 'active' : ''} onClick={() => setSidebarMode('topics')}>话题分组</button>
        </div>
      </div>

      <div className="nb-side-scroll" data-testid="sidebar-scroll-area">
        {sidebarMode === 'history' ? (
          <ChatHistoryList activeChatId={activeChatId} isChatView={isChatView}
            chats={chats} sessions={Object.values(sessionMeta)} onSelectChat={selectChat} />
        ) : (
          <TopicGroupList activeChatId={activeChatId} isChatView={isChatView}
            openTopics={openTopics} chats={chats} tasks={tasks}
            onSelectChat={selectChat} onToggleTopic={toggleTopic} />
        )}
      </div>

      <AccountFoot />
    </aside>
  );
}
