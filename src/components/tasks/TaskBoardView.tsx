// Manager board view: tasks grouped into columns by execution state. Light
// columns, gaps not rules. Each card is compact (dot + title + badge +
// trigger). Empty columns show a pale placeholder rather than blank space.
import type { Task } from '../../types';
import { TaskTypeBadge } from './TaskTypeBadge';
import { TaskStatusDot } from './TaskStatusDot';
import { TasksEmpty } from './TaskListView';

const COLUMNS: { label: string; match: (t: Task) => boolean }[] = [
  {
    label: '运行中',
    match: (t) => t.status === 'active' && (!t.runState || t.runState === 'running'),
  },
  { label: '已暂停', match: (t) => t.status === 'paused' },
  { label: '异常', match: (t) => t.runState === 'failed' },
  { label: '已完成', match: (t) => t.runState === 'done' },
];

export function TaskBoardView({
  tasks,
  onOpenTask,
}: {
  tasks: Task[];
  onOpenTask: (id: string) => void;
}) {
  if (tasks.length === 0) return <TasksEmpty />;
  return (
    <div className="nb-tk-board" data-testid="tasks-board">
      {COLUMNS.map((col) => {
        const items = tasks.filter(col.match);
        return (
          <div className="nb-tk-board-col" key={col.label}>
            <div className="nb-tk-board-colhead">
              {col.label} <span>{items.length}</span>
            </div>
            <div className="nb-tk-board-cards">
              {items.length === 0 && <div className="nb-tk-board-empty">暂无任务</div>}
              {items.map((t) => (
                <button
                  key={t.id}
                  className="nb-tk-board-card"
                  onClick={() => onOpenTask(t.id)}
                  data-testid={`task-card-${t.id}`}
                >
                  <div className="nb-tk-board-card-head">
                    <TaskStatusDot task={t} />
                    <span className="nb-tk-board-card-title">{t.title}</span>
                    <TaskTypeBadge task={t} />
                  </div>
                  <div className="nb-tk-board-card-sub">{t.trigger}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
