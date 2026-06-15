// Manager list view: flat task rows (Twitter-feed style, hairline separators,
// no per-row cards). Also exports the shared empty state used by every view.
import type { Task } from '../../types';
import { TaskRow } from './TaskRow';

export function TasksEmpty() {
  return (
    <div className="nb-tk-empty" data-testid="tasks-empty-state">
      还没有符合条件的任务。
      <br />
      回首屏说一句「帮我盯着…」，我会自动建好。
    </div>
  );
}

export function TaskListView({
  tasks,
  onOpenTask,
  onToggle,
}: {
  tasks: Task[];
  onOpenTask: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  if (tasks.length === 0) return <TasksEmpty />;
  return (
    <div className="nb-tk-list" data-testid="tasks-list">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} onOpen={onOpenTask} onToggle={onToggle} />
      ))}
    </div>
  );
}
