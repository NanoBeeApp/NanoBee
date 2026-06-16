// Left rail: brand, the page nav grid (聊天 / 今日事项 / 任务 / Artifacts /
// 研究画布 / 设置), the history/topics switch, and the page-aware "new" button.
// The scroll area below is context-aware: it shows the list that belongs to the
// current page — chats on the chat view, today's items on 今日事项, tasks on
// 任务, decks on Artifacts, projects on 研究画布. The "聊天" tile is how you
// return to the chat view from any other page; "设置" navigates to the
// /settings page (AI model & web-search configuration). The "new" button also
// adapts to the current page: 新建对话 / 新建任务 / 新建 Artifact / 新建研究.
//
// Change history:
//   2026-06-15  Wired i18n (Phase 1): nav tile labels, new-action button label,
//               brand tagline, mode switch, and collapse tooltip now use useT()
//               instead of hardcoded Chinese strings.
import { useAppStore, NEW_ACTION } from '../../store/useAppStore';
import { useT } from '../../lib/i18n/LocaleContext';
import type { View } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import { ChatHistoryList } from './ChatHistoryList';
import { TopicGroupList } from './TopicGroupList';
import { TodayNavList } from './TodayNavList';
import { TasksNavList } from './TasksNavList';
import { ArtifactsNavList } from './ArtifactsNavList';
import { ResearchNavList } from './ResearchNavList';

/** Map view → the i18n key for its new-action label. */
const NEW_ACTION_KEY: Record<View, 'newAction.chat' | 'newAction.task' | 'newAction.artifact' | 'newAction.research'> = {
  chat: 'newAction.chat',
  today: 'newAction.chat',
  tasks: 'newAction.task',
  artifacts: 'newAction.artifact',
  research: 'newAction.research',
  settings: 'newAction.chat',
};

export function Sidebar() {
  const { t } = useT();
  const view = useAppStore((s) => s.view);
  const sidebarMode = useAppStore((s) => s.sidebarMode);
  const setSidebarMode = useAppStore((s) => s.setSidebarMode);
  const activeChatId = useAppStore((s) => s.activeChatId);
  const chats = useAppStore((s) => s.chats);
  const sessionMeta = useAppStore((s) => s.sessionMeta);
  const openTopics = useAppStore((s) => s.openTopics);
  const tasks = useAppStore((s) => s.tasks);
  const selectChat = useAppStore((s) => s.selectChat);
  const newForView = useAppStore((s) => s.newForView);
  const openChat = useAppStore((s) => s.openChat);
  const openToday = useAppStore((s) => s.openToday);
  const openTasks = useAppStore((s) => s.openTasks);
  const openArtifacts = useAppStore((s) => s.openArtifacts);
  const openResearch = useAppStore((s) => s.openResearch);
  const openSettings = useAppStore((s) => s.openSettings);
  const toggleTopic = useAppStore((s) => s.toggleTopic);
  const setSideCollapsed = useAppStore((s) => s.setSideCollapsed);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
  const endPeek = useAppStore((s) => s.endPeek);

  const isChatView = view === 'chat';
  const newCfg = NEW_ACTION[view];

  return (
    // onMouseLeave only matters while peeking (endPeek is a no-op otherwise):
    // moving the pointer off the temporarily-opened sidebar auto-collapses it.
    <aside className="nb-side" id="app-sidebar" data-testid="app-sidebar" onMouseLeave={endPeek}>
      <div className="nb-side-top">
        <div className="nb-brand">
          <div className="glyph">
            <Icons.bee size={18} sw={1.6} style={{ color: '#fff' }} />
          </div>
          <div>
            <div className="name">Nano<b>Bee</b></div>
            <div className="sub">{t('brand.tagline')}</div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto', color: 'var(--ink-4)' }}
            title={t('nav.collapseSidebar')}
            onClick={() => { setSideCollapsed(true); setMobileNavOpen(false); }}
            data-testid="collapse-sidebar">
            <Icons.panelLeft size={15} />
          </button>
        </div>

        {/* Uniform 3×2 tile grid — every entry is an equal-sized short
            rectangle (icon-chip left, label right on one line) so the grid
            stays compact and reads as one balanced block. */}
        <div className="nb-nav-grid" data-testid="sidebar-nav-grid">
          <button className={`nb-nav-tile${isChatView ? ' active' : ''}`} onClick={openChat}
            data-testid="chat-entry">
            <span className="ic"><Icons.chat size={17} /></span>
            <span className="label">{t('nav.chat')}</span>
          </button>

          <button className={`nb-nav-tile${view === 'today' ? ' active' : ''}`} onClick={openToday}
            data-testid="today-inbox-entry">
            <span className="ic"><Icons.news size={17} /></span>
            <span className="label">{t('nav.today')}</span>
          </button>

          <button className={`nb-nav-tile${view === 'tasks' ? ' active' : ''}`} onClick={openTasks}
            data-testid="tasks-entry">
            <span className="ic"><Icons.bolt size={17} /></span>
            <span className="label">{t('nav.tasks')}</span>
          </button>

          <button className={`nb-nav-tile${view === 'artifacts' ? ' active' : ''}`} onClick={() => openArtifacts()}
            data-testid="artifacts-entry">
            <span className="ic"><Icons.grid size={17} /></span>
            <span className="label">{t('nav.artifacts')}</span>
          </button>

          <button className={`nb-nav-tile${view === 'research' ? ' active' : ''}`} onClick={openResearch}
            data-testid="research-entry">
            <span className="ic"><Icons.spark size={17} /></span>
            <span className="label">{t('nav.research')}</span>
          </button>

          <button className={`nb-nav-tile${view === 'settings' ? ' active' : ''}`} onClick={openSettings}
            data-testid="settings-entry">
            <span className="ic"><Icons.gear size={17} /></span>
            <span className="label">{t('nav.settings')}</span>
          </button>
        </div>

        {/* The history/topics switch only makes sense for the chat list. */}
        {isChatView && (
          <div className="nb-switch" data-testid="sidebar-view-switch">
            <button className={sidebarMode === 'history' ? 'active' : ''} onClick={() => setSidebarMode('history')}>{t('nav.chatHistory')}</button>
            <button className={sidebarMode === 'topics' ? 'active' : ''} onClick={() => setSidebarMode('topics')}>{t('nav.topicGroups')}</button>
          </div>
        )}

        {/* The "new" button lives at the foot of the fixed header, right above
            the list it seeds — a quiet white affordance so the amber tiles stay
            the visual anchor of the rail. Its label + action follow the current
            page (new chat / task / artifact / research); ⌘N triggers the same. */}
        <button className="nb-newchat" onClick={newForView} data-testid={newCfg.testid}>
          <Icons.plus size={16} />
          {t(NEW_ACTION_KEY[view])}
          <span className="kbd">⌘N</span>
        </button>
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
