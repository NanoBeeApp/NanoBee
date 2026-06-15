// Tiny pill showing the task kind (schedule / condition / one-off / batch). Pure render.
import type { Task } from '../../types';
import { kindMeta } from './taskMeta';

export function TaskTypeBadge({ task }: { task: Task }) {
  const { label, tone } = kindMeta(task);
  return (
    <span className={`nb-tk-badge tone-${tone}`} data-testid={`task-kind-${task.id}`}>
      {label}
    </span>
  );
}
