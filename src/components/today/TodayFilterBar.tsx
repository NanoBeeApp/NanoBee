// Filter chips for the Today page: "all" plus one chip per topic that actually
// has updates, each with an item count. Lives inside the page (not the sidebar)
// so the sidebar can keep showing the chat lists on every view. Topics with no
// updates are omitted, so an empty Today page shows only the "全部" chip.
import { useAppStore } from '../../store/useAppStore';
import { TOPICS, topicShortName } from '../../data/topics';

export function TodayFilterBar() {
  const updates = useAppStore((s) => s.updates);
  const filter = useAppStore((s) => s.todayFilter);
  const setFilter = useAppStore((s) => s.setTodayFilter);

  return (
    <div className="nb-fchips" data-testid="today-filter-bar">
      <button className={`nb-fchip${filter === 'all' ? ' active' : ''}`}
        onClick={() => setFilter('all')} data-testid="today-filter-all">
        全部
        <span className="cnt">{updates.length}</span>
      </button>
      {TOPICS.filter((t) => updates.some((u) => u.topicId === t.id)).map((t) => {
        const total = updates.filter((u) => u.topicId === t.id).length;
        return (
          <button key={t.id} className={`nb-fchip${filter === t.id ? ' active' : ''}`}
            onClick={() => setFilter(filter === t.id ? 'all' : t.id)}
            data-testid={`today-filter-topic-${t.id}`}>
            <span className="dot" style={{ background: t.color }} />
            {topicShortName(t)}
            <span className="cnt">{total}</span>
          </button>
        );
      })}
    </div>
  );
}
