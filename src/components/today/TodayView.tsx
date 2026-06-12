// "今日事项" reading surface (Inoreader-style): timeline / list / card views,
// expand-to-read, scroll-past auto-read, mark-all-read and a reading progress
// bar. Filtering lives in the store (`todayFilter`) and is driven by the
// sidebar's TodayNav; the toolbar only shows a clearable chip for the active
// filter. Reports the item currently in view so the global quick chat can be
// context-aware.
import { useEffect, useRef, useState } from 'react';
import { useAppStore, selectUnreadCount } from '../../store/useAppStore';
import { topicById, topicShortName } from '../../data/topics';
import { Icons } from '../../icons/icons';
import { Toggle } from '../common/Toggle';
import { TimelineCard } from './TimelineCard';
import { ReadRow } from './ReadRow';
import { ReadCard } from './ReadCard';

type ViewMode = 'timeline' | 'list' | 'card';

const GROUPS = ['今天', '本周'] as const;
/** An item counts as "currently being viewed" once its bottom edge passes this offset. */
const VIEWING_TOP_OFFSET = 100;
/** An item scrolled this far above the viewport top is auto-marked as read. */
const AUTOREAD_TOP_MARGIN = 40;

export function TodayView() {
  const updates = useAppStore((s) => s.updates);
  const markRead = useAppStore((s) => s.markRead);
  const markAllRead = useAppStore((s) => s.markAllRead);
  const openUpdateInChat = useAppStore((s) => s.openUpdateInChat);
  const setQuickCtx = useAppStore((s) => s.setQuickCtx);
  const filter = useAppStore((s) => s.todayFilter);
  const setFilter = useAppStore((s) => s.setTodayFilter);
  const unreadCount = useAppStore(selectUnreadCount);

  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [autoRead, setAutoRead] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reportedRef = useRef<string | null>(null);

  const pct = updates.length ? Math.round(((updates.length - unreadCount) / updates.length) * 100) : 100;

  const filtered = updates.filter((u) =>
    filter === 'all' ? true : filter === 'unread' ? u.unread : u.topicId === filter);

  const toggleExpand = (id: string) => {
    setExpanded((e) => (e === id ? null : id));
    const it = updates.find((u) => u.id === id);
    if (it?.unread) markRead(id, true); // opening an item marks it read
  };

  // Context awareness: report the first visible item as "currently viewing".
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    let raf = 0;
    const compute = () => {
      raf = 0;
      const rootRect = root.getBoundingClientRect();
      const els = root.querySelectorAll('[data-cid]');
      let found: string | null = null;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.bottom > rootRect.top + VIEWING_TOP_OFFSET) {
          found = el.getAttribute('data-cid');
          break;
        }
      }
      if (found !== reportedRef.current) {
        reportedRef.current = found;
        const it = updates.find((u) => u.id === found);
        setQuickCtx(it ? { id: it.id, title: it.title, topicId: it.topicId } : null);
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute); };
    root.addEventListener('scroll', onScroll);
    compute();
    return () => {
      root.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [viewMode, filter, updates, setQuickCtx]);

  // Scroll-past auto-read: mark items read once they scroll out above.
  useEffect(() => {
    if (!autoRead) return;
    const root = scrollRef.current;
    if (!root) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const topEdge = en.rootBounds ? en.rootBounds.top + AUTOREAD_TOP_MARGIN : VIEWING_TOP_OFFSET;
        if (!en.isIntersecting && en.boundingClientRect.bottom < topEdge) {
          const id = en.target.getAttribute('data-rid');
          if (id) markRead(id, true);
        }
      });
    }, { root, threshold: 0 });
    root.querySelectorAll('[data-rid]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [autoRead, viewMode, filter, updates, markRead]);

  // Label of the active filter (filtering itself happens in the sidebar nav).
  const filterTopic = topicById(filter);
  const filterLabel = filter === 'unread' ? '未读' : filterTopic ? topicShortName(filterTopic) : null;

  return (
    <div className="nb-today" ref={scrollRef} data-testid="today-reading-page">
      <div className="nb-today-inner">
        <div className="nb-today-date">06月12日 · 周五 · NanoBee 已为你整理</div>
        <div className="nb-today-top">
          <h1>今天需要你关心的事</h1>
          <span className="doneline" data-testid="today-unread-summary">
            {unreadCount > 0 ? `还有 ${unreadCount} 件未读` : '全部读完了'}
          </span>
        </div>
        <div className="nb-progress"><div className="fill" style={{ width: `${pct}%` }} /></div>

        <div className="nb-read-toolbar" data-testid="today-toolbar">
          {filterLabel && (
            <button className="nb-fchip active" title="清除筛选" onClick={() => setFilter('all')}
              data-testid="today-active-filter">
              {filterLabel}
              <Icons.x size={11} style={{ marginLeft: 5 }} />
            </button>
          )}
          <span className="nb-tool-ics">
            <button className="btn btn-ghost btn-icon btn-sm" title="全部标为已读" onClick={markAllRead}
              disabled={unreadCount === 0} data-testid="mark-all-read">
              <Icons.check size={15} />
            </button>
            <span className="nb-viewseg" data-testid="today-view-switch">
              <button className={viewMode === 'timeline' ? 'active' : ''} title="时间线"
                onClick={() => setViewMode('timeline')} data-testid="today-view-timeline"><Icons.feed size={14} /></button>
              <button className={viewMode === 'list' ? 'active' : ''} title="列表"
                onClick={() => setViewMode('list')} data-testid="today-view-list"><Icons.list size={14} /></button>
              <button className={viewMode === 'card' ? 'active' : ''} title="卡片"
                onClick={() => setViewMode('card')} data-testid="today-view-card"><Icons.grid size={14} /></button>
            </span>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <button className="btn btn-ghost btn-icon btn-sm" title="更多"
                onClick={() => setMenuOpen((o) => !o)} data-testid="today-more-menu">
                <Icons.more size={15} />
              </button>
              {menuOpen && (
                <>
                  <div className="nb-scrim" onClick={() => setMenuOpen(false)} />
                  <div className="nb-mini-menu" data-testid="today-more-menu-popover">
                    <div className="mrow">
                      <span>滑过自动已读</span>
                      <Toggle checked={autoRead} onChange={setAutoRead} testId="auto-read-toggle" />
                    </div>
                    <div className={`mrow btnrow${unreadCount === 0 ? ' off' : ''}`}
                      onClick={() => { if (unreadCount > 0) markAllRead(); setMenuOpen(false); }}>
                      全部标为已读
                    </div>
                    <div className="mrow btnrow" onClick={() => { setExpanded(null); setMenuOpen(false); }}>
                      收起全部展开
                    </div>
                  </div>
                </>
              )}
            </span>
          </span>
        </div>

        {filtered.length === 0 && (
          <div className="nb-alldone" data-testid="today-all-done">
            <div className="big"><Icons.check size={28} /></div>
            <h3>都看完了</h3>
            <p>有新的重要动态时，我会第一时间放到这里并通知你。</p>
          </div>
        )}

        {GROUPS.map((g) => {
          const items = filtered.filter((u) => u.group === g);
          if (!items.length) return null;
          return (
            <div key={g} className={viewMode === 'timeline' ? 'nb-tlwrap' : ''}>
              <div className="nb-grp" style={{ paddingLeft: 2 }}>{g}</div>
              {viewMode === 'timeline' ? (
                <div>
                  {items.map((u) => (
                    <TimelineCard key={u.id} item={u} onOpenChat={openUpdateInChat} onToggleRead={markRead} />
                  ))}
                </div>
              ) : viewMode === 'list' ? (
                <div className="nb-read-list">
                  {items.map((u) => (
                    <ReadRow key={u.id} item={u} expanded={expanded === u.id} onToggleExpand={toggleExpand}
                      onOpenChat={openUpdateInChat} onToggleRead={markRead} />
                  ))}
                </div>
              ) : (
                <div className="nb-read-grid">
                  {items.map((u) => (
                    <ReadCard key={u.id} item={u} expanded={expanded === u.id} onToggleExpand={toggleExpand}
                      onOpenChat={openUpdateInChat} onToggleRead={markRead} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
