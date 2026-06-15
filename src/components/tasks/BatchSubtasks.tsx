// The expanded child rows under a batch task: one line per input with its
// status dot, the input label, a short result / failure reason, and a Retry
// button on failed rows. Read-only view of the batch surface; the real
// per-row execution pipeline (scheduling, retries) is a later backend concern.
import type { TaskBatch, SubTaskStatus } from '../../types';

const SUB_TONE: Record<SubTaskStatus, string> = {
  queued: 'paused',
  running: 'running',
  success: 'active',
  failed: 'failed',
};
const SUB_LABEL: Record<SubTaskStatus, string> = {
  queued: '排队中',
  running: '运行中',
  success: '成功',
  failed: '失败',
};

export function BatchSubtasks({ batch }: { batch: TaskBatch }) {
  return (
    <ul className="nb-tk-subtasks" data-testid="task-subtasks">
      {batch.subtasks.map((s) => (
        <li key={s.id} className="nb-tk-subtask" data-testid={`task-subtask-${s.id}`}>
          <span className={`nb-tk-dot tone-${SUB_TONE[s.status]}`} aria-hidden />
          <span className="nb-tk-subtask-input">{s.input}</span>
          <span className={`nb-tk-subtask-status tone-${SUB_TONE[s.status]}`}>
            {SUB_LABEL[s.status]}
          </span>
          <span className="nb-tk-subtask-result">{s.result}</span>
          {s.status === 'failed' && (
            <button className="nb-tk-subtask-retry" data-testid={`task-subtask-retry-${s.id}`}>
              重试
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
