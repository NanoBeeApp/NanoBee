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
import { useState, useRef, useEffect } from 'react';
import { useAppStore, NEW_ACTION } from '../../store/useAppStore';
import { useT } from '../../lib/i18n/LocaleContext';
import type { View } from '../../store/useAppStore';
import type { IconName } from '../../types';
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

  // Apps popup open state. Hovering the button opens it; a short grace delay on
  // leave lets the pointer travel button → popup without dismissing it. A click
  // toggles it (and keyboard/touch users get a real button to press).
  const [appsOpen, setAppsOpen] = useState(false);
  const appsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openApps = () => {
    if (appsTimer.current) clearTimeout(appsTimer.current);
    setAppsOpen(true);
  };
  const closeApps = (delay = 130) => {
    if (appsTimer.current) clearTimeout(appsTimer.current);
    appsTimer.current = setTimeout(() => setAppsOpen(false), delay);
  };
  useEffect(() => () => { if (appsTimer.current) clearTimeout(appsTimer.current); }, []);

  // The six page entries, surfaced inside the Apps popup (was the 3×2 nav grid).
  const apps: Array<{ key: View; icon: IconName; label: string; onClick: () => void; testid: string }> = [
    { key: 'chat', icon: 'chat', label: t('nav.chat'), onClick: openChat, testid: 'chat-entry' },
    { key: 'today', icon: 'news', label: t('nav.today'), onClick: openToday, testid: 'today-inbox-entry' },
    { key: 'tasks', icon: 'bolt', label: t('nav.tasks'), onClick: openTasks, testid: 'tasks-entry' },
    { key: 'artifacts', icon: 'grid', label: t('nav.artifacts'), onClick: () => openArtifacts(), testid: 'artifacts-entry' },
    { key: 'research', icon: 'spark', label: t('nav.research'), onClick: openResearch, testid: 'research-entry' },
    { key: 'settings', icon: 'gear', label: t('nav.settings'), onClick: openSettings, testid: 'settings-entry' },
  ];

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

        {/* Launcher row: an "Apps" hover popup holding the six page entries on
            the left, plus the page-aware "new" button on the right. The popup
            replaces the old always-expanded 3×2 nav grid so the rail header
            stays compact; it opens on hover or click and the active page tile
            stays highlighted inside it. */}
        <div className={`nb-launchbar${appsOpen ? ' open' : ''}`} data-testid="sidebar-launchbar">
          <div className="nb-apps-wrap" onMouseEnter={openApps} onMouseLeave={() => closeApps()}>
            <button className={`nb-apps-btn${appsOpen ? ' active' : ''}`}
              aria-haspopup="true" aria-expanded={appsOpen}
              onClick={() => setAppsOpen((o) => !o)} data-testid="apps-entry">
              <span className="ai"><Icons.grid size={17} /></span>
              <span className="al">{t('nav.apps')}</span>
              <span className="achev"><Icons.chevR size={14} /></span>
            </button>
          </div>

          <button className="nb-newbtn" onClick={newForView} data-testid={newCfg.testid}>
            <Icons.plus size={16} />
            <span className="nl">{t(NEW_ACTION_KEY[view])}</span>
            <span className="kbd">⌘N</span>
          </button>

          {/* Rendered inside the launchbar so it inherits its width and the
              pointer can travel button → popup without crossing a dead gap. */}
          <div className="nb-apps-pop" role="menu" data-testid="apps-popup"
            onMouseEnter={openApps} onMouseLeave={() => closeApps()}>
            <div className="nb-qgrid">
              {apps.map((a) => {
                const Icon = Icons[a.icon];
                return (
                  <button key={a.key} role="menuitem"
                    className={`nb-qtile${view === a.key ? ' active' : ''}`}
                    onClick={() => { a.onClick(); setAppsOpen(false); }}
                    data-testid={a.testid}>
                    <span className="qi"><Icon size={18} /></span>
                    <span className="ql">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* The history/topics switch only makes sense for the chat list. */}
        {isChatView && (
          <div className="nb-switch" data-testid="sidebar-view-switch">
            <button className={sidebarMode === 'history' ? 'active' : ''} onClick={() => setSidebarMode('history')}>{t('nav.chatHistory')}</button>
            <button className={sidebarMode === 'topics' ? 'active' : ''} onClick={() => setSidebarMode('topics')}>{t('nav.topicGroups')}</button>
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
