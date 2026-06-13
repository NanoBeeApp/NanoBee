// Sidebar list for the "今日事项" page: a compact, scannable index of today's
// proactive items, grouped 今天 / 本周 to mirror the reading surface. Clicking
// an entry scrolls the reading surface to that item (via the store's focusItem),
// first clearing the topic filter when needed so the target is actually visible.
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../icons/icons';

const GROUPS = ['今天', '本周'] as const;

export function TodayNavList() {
  const updates = useAppStore((s) => s.updates);
  const filter = useAppStore((s) => s.todayFilter);
  const setTodayFilter = useAppStore((s) => s.setTodayFilter);
  const focusItem = useAppStore((s) => s.focusItem);

  const jumpTo = (topicId: string, id: string) => {
    // The reading surface hides filtered-out items — clear the filter first so
    // the scroll target exists in the DOM before focusItem fires.
    if (filter !== 'all' && filter !== topicId) setTodayFilter('all');
    focusItem(id);
  };

  if (updates.length === 0) {
    return <div className="nb-side-empty" data-testid="sidebar-today-empty">今天还没有新动态</div>;
  }

  return (
    <div data-testid="sidebar-today-list">
      {GROUPS.map((g) => {
        const items = updates.filter((u) => u.group === g);
        if (!items.length) return null;
        return (
          <div key={g}>
            <div className="nb-grp">{g}</div>
            {items.map((u) => (
              <div key={u.id} className="nb-item" onClick={() => jumpTo(u.topicId, u.id)}
                data-testid={`today-nav-item-${u.id}`}>
                <span className="nb-item-ic" style={{ color: u.color }}><Icon name={u.icon} size={15} /></span>
                <div className="meta">
                  <div className="title">{u.title}</div>
                  <div className="sub">{u.time}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
