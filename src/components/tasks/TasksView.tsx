// Full-page task center — replaces the old right rail. Opened from the
// sidebar "任务" entry: topic filter chips, the gold live-monitor card,
// task cards in a two-column grid, and an empty-state nudge.
import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { TOPICS, topicShortName } from '../../data/topics';
import { Icons } from '../../icons/icons';
import { TaskCard } from './TaskCard';

/** The gold topic shows a live monitor card (design default: enabled). */
const MONITOR_TOPIC_ID = 'gold';

export function TasksView() {
  const tasks = useAppStore((s) => s.tasks);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const justAddedTaskId = useAppStore((s) => s.justAddedTaskId);
  const focusItemId = useAppStore((s) => s.focusItemId);
  const focusItemTick = useAppStore((s) => s.focusItemTick);
  const filter = useAppStore((s) => s.tasksFilter);
  const setFilter = useAppStore((s) => s.setTasksFilter);
  const scrollRef = useRef<HTMLDivElement>(null);

  const list = filter === 'all' ? tasks : tasks.filter((t) => t.topicId === filter);

  // Sidebar TasksNavList click → scroll the matching task card into view. The
  // sidebar clears the filter before calling focusItem, so the target is in the
  // DOM; the tick is in the deps so clicking the same task twice re-scrolls.
  useEffect(() => {
    if (!focusItemId) return;
    const raf = requestAnimationFrame(() => {
      const el = scrollRef.current?.querySelector(`[data-cid="${CSS.escape(focusItemId)}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(raf);
  }, [focusItemId, focusItemTick]);
  const activeCount = tasks.filter((t) => t.status === 'active').length;
  const pausedCount = tasks.length - activeCount;
  const showMonitor = filter === MONITOR_TOPIC_ID;

  // Only offer chips for topics that actually have tasks.
  const chips = [
    { v: 'all', l: '全部' },
    ...TOPICS.filter((t) => tasks.some((k) => k.topicId === t.id))
      .map((t) => ({ v: t.id, l: topicShortName(t) })),
  ];

  return (
    <div className="nb-taskspage" ref={scrollRef} data-testid="tasks-page">
      <div className="nb-taskspage-inner">
        <div className="nb-taskspage-kicker">自动任务 · NanoBee 替你盯着</div>
        <div className="nb-taskspage-head">
          <h1>任务</h1>
          <span className="sum" data-testid="tasks-summary">
            {tasks.length === 0
              ? '还没有任务'
              : `${activeCount} 个运行中${pausedCount > 0 ? ` · ${pausedCount} 个已暂停` : ''}`}
          </span>
        </div>

        <div className="nb-read-toolbar" data-testid="tasks-toolbar">
          {chips.map((c) => (
            <button key={c.v} className={`nb-fchip${filter === c.v ? ' active' : ''}`}
              onClick={() => setFilter(c.v)} data-testid={`tasks-filter-${c.v}`}>
              {c.l}
            </button>
          ))}
          <span className="nb-tool-ics">
            <button className="btn btn-secondary btn-sm" style={{ gap: 6 }} data-testid="new-task-button">
              <Icons.plus size={13} /> 新建任务
            </button>
          </span>
        </div>

        {showMonitor && (
          <div className="nb-monitor" data-testid="gold-live-monitor">
            <div className="ml">现货黄金 · XAU/USD · 实时</div>
            <div className="mv">$2,412.50</div>
            <div className="md up"><Icons.trend size={13} /> +2.8% · +$65.80 今日</div>
            <svg viewBox="0 0 320 56" style={{ width: '100%', height: 50, marginTop: 12, display: 'block' }} preserveAspectRatio="none">
              <path d="M0,42 L40,40 L80,44 L120,38 L160,40 L200,32 L240,30 L280,18 L320,8 L320,56 L0,56 Z" fill="#6fd99a" opacity="0.16" />
              <path d="M0,42 L40,40 L80,44 L120,38 L160,40 L200,32 L240,30 L280,18 L320,8" stroke="#6fd99a" strokeWidth="2" fill="none" strokeLinejoin="round" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(245,244,239,0.5)', marginTop: 4 }}>
              <span>09:30</span><span>现在</span>
            </div>
          </div>
        )}

        {list.length === 0 && (
          <div className="nb-tasks-empty" data-testid="tasks-empty-state">
            <div className="glyph"><Icons.bolt size={20} /></div>
            还没有任务。<br />在对话里说一句<br /><b>“帮我盯着…”</b>，我会自动建好。
          </div>
        )}

        {list.length > 0 && (
          <div className="nb-tasks-grid" data-testid="tasks-list">
            {list.map((k) => (
              <div key={k.id} data-cid={k.id}
                style={justAddedTaskId === k.id ? { animation: 'nbtoast 0.4s var(--ease-out)' } : undefined}>
                <TaskCard k={k} onToggle={toggleTask} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
