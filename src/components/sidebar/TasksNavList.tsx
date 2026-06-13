// Sidebar list for the "任务" page: every automated task, split into 进行中 /
// 已暂停 so the running ones lead. Clicking an entry scrolls the task center to
// that task card (via the store's focusItem).
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import type { Task } from '../../types';

export function TasksNavList() {
  const tasks = useAppStore((s) => s.tasks);
  const focusItem = useAppStore((s) => s.focusItem);
  const setTasksFilter = useAppStore((s) => s.setTasksFilter);

  // Clear the page filter first so a task on any topic is in the DOM, then ask
  // the task center to scroll it into view.
  const jumpTo = (id: string) => {
    setTasksFilter('all');
    focusItem(id);
  };

  if (tasks.length === 0) {
    return <div className="nb-side-empty" data-testid="sidebar-tasks-empty">还没有任务</div>;
  }

  const active = tasks.filter((t) => t.status === 'active');
  const paused = tasks.filter((t) => t.status === 'paused');

  const renderGroup = (label: string, list: Task[]) => {
    if (!list.length) return null;
    return (
      <div key={label}>
        <div className="nb-grp">{label}</div>
        {list.map((k) => (
          <div key={k.id} className="nb-item" onClick={() => jumpTo(k.id)}
            data-testid={`tasks-nav-item-${k.id}`}>
            <span className="nb-item-ic" style={{ color: k.iconColor }}><Icons.bolt size={15} /></span>
            <div className="meta">
              <div className="title">{k.title}</div>
              <div className="sub">{k.next}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div data-testid="sidebar-tasks-list">
      {renderGroup('进行中', active)}
      {renderGroup('已暂停', paused)}
    </div>
  );
}
