// Left rail: brand, new-chat button, and the page nav grid (聊天 / 今日事项 /
// 任务 / Artifacts / 研究画布). The scroll area below is context-aware: it shows
// the list that belongs to the current page — chats on the chat view, today's
// items on 今日事项, tasks on 任务, decks on Artifacts, projects on 研究画布.
// The "聊天" tile is how you return to the chat view from any other page.
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import { ChatHistoryList } from './ChatHistoryList';
import { TopicGroupList } from './TopicGroupList';
import { TodayNavList } from './TodayNavList';
import { TasksNavList } from './TasksNavList';
import { ArtifactsNavList } from './ArtifactsNavList';
import { ResearchNavList } from './ResearchNavList';

export function Sidebar() {
  const view = useAppStore((s) => s.view);
  const sidebarMode = useAppStore((s) => s.sidebarMode);
  const setSidebarMode = useAppStore((s) => s.setSidebarMode);
  const activeChatId = useAppStore((s) => s.activeChatId);
  const chats = useAppStore((s) => s.chats);
  const sessionMeta = useAppStore((s) => s.sessionMeta);
  const openTopics = useAppStore((s) => s.openTopics);
  const tasks = useAppStore((s) => s.tasks);
  const selectChat = useAppStore((s) => s.selectChat);
  const newChat = useAppStore((s) => s.newChat);
  const openChat = useAppStore((s) => s.openChat);
  const openToday = useAppStore((s) => s.openToday);
  const openTasks = useAppStore((s) => s.openTasks);
  const openArtifacts = useAppStore((s) => s.openArtifacts);
  const openResearch = useAppStore((s) => s.openResearch);
  const toggleTopic = useAppStore((s) => s.toggleTopic);
  const setSideCollapsed = useAppStore((s) => s.setSideCollapsed);
  const endPeek = useAppStore((s) => s.endPeek);

  const isChatView = view === 'chat';
  const activeTaskCount = tasks.filter((t) => t.status === 'active').length;

  return (
    // onMouseLeave only matters while peeking (endPeek is a no-op otherwise):
    // moving the pointer off the temporarily-opened sidebar auto-collapses it.
    <aside className="nb-side" data-testid="app-sidebar" onMouseLeave={endPeek}>
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

        <div className="nb-nav-grid" data-testid="sidebar-nav-grid">
          <button className={`nb-nav-tile wide${isChatView ? ' active' : ''}`} onClick={openChat}
            data-testid="chat-entry">
            <span className="ic"><Icons.chat size={16} /></span>
            <span className="label">聊天</span>
          </button>

          <button className={`nb-nav-tile${view === 'today' ? ' active' : ''}`} onClick={openToday}
            data-testid="today-inbox-entry">
            <span className="ic"><Icons.news size={16} /></span>
            <span className="label">今日事项</span>
          </button>

          <button className={`nb-nav-tile${view === 'tasks' ? ' active' : ''}`} onClick={openTasks}
            data-testid="tasks-entry">
            <span className="ic"><Icons.bolt size={16} /></span>
            <span className="label">任务</span>
            {activeTaskCount > 0 && <span className="count" data-testid="tasks-active-count">{activeTaskCount}</span>}
          </button>

          <button className={`nb-nav-tile${view === 'artifacts' ? ' active' : ''}`} onClick={() => openArtifacts()}
            data-testid="artifacts-entry">
            <span className="ic"><Icons.grid size={16} /></span>
            <span className="label">Artifacts</span>
          </button>

          <button className={`nb-nav-tile${view === 'research' ? ' active' : ''}`} onClick={openResearch}
            data-testid="research-entry">
            <span className="ic"><Icons.spark size={16} /></span>
            <span className="label">研究画布</span>
          </button>
        </div>

        {/* The history/topics switch only makes sense for the chat list. */}
        {isChatView && (
          <div className="nb-switch" data-testid="sidebar-view-switch">
            <button className={sidebarMode === 'history' ? 'active' : ''} onClick={() => setSidebarMode('history')}>聊天记录</button>
            <button className={sidebarMode === 'topics' ? 'active' : ''} onClick={() => setSidebarMode('topics')}>话题分组</button>
          </div>
        )}
      </div>

      <div className="nb-side-scroll" data-testid="sidebar-scroll-area">
        {isChatView ? (
          sidebarMode === 'history' ? (
            <ChatHistoryList activeChatId={activeChatId} isChatView={isChatView}
              chats={chats} sessions={Object.values(sessionMeta)} onSelectChat={selectChat} />
          ) : (
            <TopicGroupList activeChatId={activeChatId} isChatView={isChatView}
              openTopics={openTopics} chats={chats} tasks={tasks}
              onSelectChat={selectChat} onToggleTopic={toggleTopic} />
          )
        ) : view === 'today' ? (
          <TodayNavList />
        ) : view === 'tasks' ? (
          <TasksNavList />
        ) : view === 'artifacts' ? (
          <ArtifactsNavList />
        ) : view === 'research' ? (
          <ResearchNavList />
        ) : null}
      </div>
    </aside>
  );
}
