// Right rail: live monitor card for the gold topic plus the task list scoped
// to the current topic (all tasks when no topic is active).
import { useAppStore } from '../../store/useAppStore';
import { topicById, topicShortName } from '../../data/topics';
import { Icons } from '../../icons/icons';
import { TaskCard } from './TaskCard';

/** The gold topic shows a live monitor card (design default: enabled). */
const MONITOR_TOPIC_ID = 'gold';

export function TaskRail() {
  const activeTopicId = useAppStore((s) => s.activeTopicId);
  const tasks = useAppStore((s) => s.tasks);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const setRailCollapsed = useAppStore((s) => s.setRailCollapsed);
  const justAddedTaskId = useAppStore((s) => s.justAddedTaskId);

  const topic = topicById(activeTopicId) ?? null;
  const list = topic ? tasks.filter((t) => t.topicId === topic.id) : tasks;
  const showMonitor = topic?.id === MONITOR_TOPIC_ID;

  return (
    <aside className="nb-rail" data-testid="task-rail">
      <div className="nb-rail-head">
        <span style={{ color: 'var(--nb-amber)' }}><Icons.bolt size={16} /></span>
        <span className="rt">{topic ? `${topicShortName(topic)} · 任务` : '全部任务'}</span>
        <span className="badge badge-neutral">{list.length}</span>
        <button className="btn btn-ghost btn-icon btn-sm" title="收起面板"
          onClick={() => setRailCollapsed(true)} data-testid="collapse-task-rail">
          <Icons.panelRight size={15} />
        </button>
      </div>
      <div className="nb-rail-scroll" data-testid="task-rail-list">
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
          <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: '40px 12px', lineHeight: 1.6 }}
            data-testid="task-rail-empty-state">
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--surface-3)', display: 'grid', placeItems: 'center', margin: '0 auto 12px', color: 'var(--ink-4)' }}>
              <Icons.bolt size={20} />
            </div>
            还没有任务。<br />在对话里说一句<br /><b style={{ color: 'var(--ink-2)' }}>“帮我盯着…”</b>，我会自动建好。
          </div>
        )}

        {list.map((k) => (
          <div key={k.id} style={justAddedTaskId === k.id ? { animation: 'nbtoast 0.4s var(--ease-out)' } : undefined}>
            <TaskCard k={k} onToggle={toggleTask} />
          </div>
        ))}

        {list.length > 0 && (
          <button className="btn btn-secondary btn-sm" style={{ width: '100%', gap: 6 }} data-testid="new-task-button">
            <Icons.plus size={13} /> 新建任务
          </button>
        )}
      </div>
    </aside>
  );
}
