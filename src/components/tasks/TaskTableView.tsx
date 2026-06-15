// Manager table view: dense rows with multi-select + a light bulk-action bar.
// For the high-density "lots of tasks / batch results" management case. The
// bulk bar is a pale floating strip (no dark block, per the white-surface rule).
import { useState } from 'react';
import type { Task } from '../../types';
import { TaskTypeBadge } from './TaskTypeBadge';
import { statusLabel, statusTone } from './taskMeta';
import { TasksEmpty } from './TaskListView';
import { useAppStore } from '../../store/useAppStore';

export function TaskTableView({
  tasks,
  onOpenTask,
  onToggle,
}: {
  tasks: Task[];
  onOpenTask: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const deleteTask = useAppStore((s) => s.deleteTask);
  const toast = useAppStore((s) => s.toast);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (tasks.length === 0) return <TasksEmpty />;

  const toggleSel = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSel = () => setSelected(new Set());
  const bulkToggle = () => {
    selected.forEach((id) => onToggle(id));
    clearSel();
  };
  const bulkDelete = () => {
    selected.forEach((id) => deleteTask(id));
    clearSel();
  };

  return (
    <div className="nb-tk-tablewrap" data-testid="tasks-table">
      <table className="nb-tk-table">
        <thead>
          <tr>
            <th className="nb-tk-th-check" />
            <th>任务名</th>
            <th>类型</th>
            <th>状态</th>
            <th>触发</th>
            <th>下次运行</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr
              key={t.id}
              data-testid={`task-trow-${t.id}`}
              className={selected.has(t.id) ? 'is-sel' : ''}
            >
              <td className="nb-tk-td-check">
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={() => toggleSel(t.id)}
                  aria-label={`选择 ${t.title}`}
                />
              </td>
              <td>
                <button className="nb-tk-tablename" onClick={() => onOpenTask(t.id)}>
                  {t.title}
                </button>
              </td>
              <td>
                <TaskTypeBadge task={t} />
              </td>
              <td>
                <span className={`nb-tk-pill tone-${statusTone(t)}`}>{statusLabel(t)}</span>
              </td>
              <td className="nb-tk-td-muted">{t.trigger}</td>
              <td className="nb-tk-td-muted">{t.next}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected.size > 0 && (
        <div className="nb-tk-bulkbar" data-testid="tasks-bulk-bar">
          <span className="nb-tk-bulk-count">已选 {selected.size} 项</span>
          <button onClick={bulkToggle}>暂停/恢复</button>
          <button onClick={() => toast('移动话题开发中')}>移动话题</button>
          <button onClick={() => toast('导出开发中')}>导出</button>
          <button className="danger" onClick={bulkDelete}>
            删除
          </button>
          <button className="nb-tk-bulk-x" onClick={clearSel} aria-label="清除选择">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
