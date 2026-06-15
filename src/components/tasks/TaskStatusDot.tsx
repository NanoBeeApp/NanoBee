// Colored status dot: active green / paused gray / running amber-pulse /
// failed red / done blue. Pure render. The amber "running" dot is the only
// looping animation on the page (a small, restrained pulse).
import type { Task } from '../../types';
import { statusTone } from './taskMeta';

export function TaskStatusDot({ task }: { task: Task }) {
  const tone = statusTone(task);
  return (
    <span
      className={`nb-tk-dot tone-${tone}${tone === 'running' ? ' pulse' : ''}`}
      aria-hidden
    />
  );
}
