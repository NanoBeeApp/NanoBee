// "今日事项" reading surface (Inoreader-style): timeline / list / card views
// with expand-to-read. Filtering lives in the store (`todayFilter`) and is
// driven by the in-page TodayFilterBar chips in the toolbar. Reports the item
// currently in view so the global quick chat can be context-aware.
//
// Change history:
//   2026-06-15  Richer empty state: explains the feed purpose + CTA to create
//               a task so users aren't dead-ended on a blank screen.
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import { TodayFilterBar } from './TodayFilterBar';
import { TimelineCard } from './TimelineCard';
import { ReadRow } from './ReadRow';
import { ReadCard } from './ReadCard';
import { TodayEmptyState } from './TodayEmptyState';

type ViewMode = 'timeline' | 'list' | 'card';

const GROUPS = ['今天', '本周'] as const;
/** An item counts as "currently being viewed" once its bottom edge passes this offset. */
const VIEWING_TOP_OFFSET = 100;

export function TodayView() {
  const updates = useAppStore((s) => s.updates);
  const openUpdateInChat = useAppStore((s) => s.openUpdateInChat);
  const setQuickCtx = useAppStore((s) => s.setQuickCtx);
  const filter = useAppStore((s) => s.todayFilter);
  const focusItemId = useAppStore((s) => s.focusItemId);
  const focusItemTick = useAppStore((s) => s.focusItemTick);

  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reportedRef = useRef<string | null>(null);

  const filtered = updates.filter((u) => (filter === 'all' ? true : u.topicId === filter));

  const toggleExpand = (id: string) => {
    setExpanded((e) => (e === id ? null : id));
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

  // Sidebar TodayNavList click → scroll the matching item into view. The tick
  // is in the deps so clicking the same item twice re-scrolls; the rAF lets a
  // just-cleared filter render the target first.
  useEffect(() => {
    if (!focusItemId) return;
    const raf = requestAnimationFrame(() => {
      const el = scrollRef.current?.querySelector(`[data-cid="${CSS.escape(focusItemId)}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [focusItemId, focusItemTick]);

  return (
    <div className="nb-today" ref={scrollRef} data-testid="today-reading-page">
      <div className="nb-today-inner">
        <div className="nb-today-date">06月12日 · 周五 · NanoBee 已为你整理</div>
        <div className="nb-today-top">
          <h1>今天需要你关心的事</h1>
        </div>

        <div className="nb-read-toolbar" data-testid="today-toolbar">
          <TodayFilterBar />
          <span className="nb-tool-ics">
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
          <TodayEmptyState hasFilter={filter !== 'all'} />
        )}

        {GROUPS.map((g) => {
          const items = filtered.filter((u) => u.group === g);
          if (!items.length) return null;
          return (
            <div key={g}>
              <div className="nb-grp" style={{ paddingLeft: 2 }}>{g}</div>
              {viewMode === 'timeline' ? (
                <div>
                  {items.map((u) => (
                    <TimelineCard key={u.id} item={u} />
                  ))}
                </div>
              ) : viewMode === 'list' ? (
                <div className="nb-read-list">
                  {items.map((u) => (
                    <ReadRow key={u.id} item={u} expanded={expanded === u.id} onToggleExpand={toggleExpand}
                      onOpenChat={openUpdateInChat} />
                  ))}
                </div>
              ) : (
                <div className="nb-read-grid">
                  {items.map((u) => (
                    <ReadCard key={u.id} item={u} expanded={expanded === u.id} onToggleExpand={toggleExpand}
                      onOpenChat={openUpdateInChat} />
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
