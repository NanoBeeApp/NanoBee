// One task row in the manager list view: status dot + title + type badge, a
// trigger/topic subline, a "最近" result subline, the next-run/status on the
// right, an enable toggle, and — for batch tasks — a progress bar plus an
// expander revealing the child subtasks. Clicking the row body opens the
// detail drawer.
import { useState } from 'react';
import type { Task } from '../../types';
import { TaskStatusDot } from './TaskStatusDot';
import { TaskTypeBadge } from './TaskTypeBadge';
import { BatchSubtasks } from './BatchSubtasks';
import { statusLabel, taskKind } from './taskMeta';
import { TOPICS } from '../../data/topics';
import { Icons } from '../../icons/icons';

function topicName(id: string): string | null {
  return TOPICS.find((t) => t.id === id)?.name ?? null;
}

export function TaskRow({
  task,
  onOpen,
  onToggle,
}: {
  task: Task;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isBatch = taskKind(task) === 'batch';
  const topic = topicName(task.topicId);
  const paused = task.status === 'paused';
  const pct = task.batch ? (task.batch.done / Math.max(1, task.batch.total)) * 100 : 0;

  return (
    <div className={`nb-tk-row-wrap${paused ? ' is-paused' : ''}`} data-testid={`task-row-${task.id}`}>
      <div className="nb-tk-row">
        <button
          className="nb-tk-row-main"
          onClick={() => onOpen(task.id)}
          aria-label={`打开任务 ${task.title}`}
        >
          <TaskStatusDot task={task} />
          <span className="nb-tk-row-body">
            <span className="nb-tk-row-titleline">
              <span className="nb-tk-row-title">{task.title}</span>
              <TaskTypeBadge task={task} />
            </span>
            <span className="nb-tk-row-sub">
              {task.trigger}
              {topic && <span className="nb-tk-row-topic"> · {topic}</span>}
            </span>
            {task.result && <span className="nb-tk-row-recent">最近：{task.result}</span>}
          </span>
        </button>

        {isBatch && task.batch ? (
          <div className="nb-tk-row-batch">
            <div
              className="nb-tk-progress"
              role="progressbar"
              aria-valuenow={task.batch.done}
              aria-valuemin={0}
              aria-valuemax={task.batch.total}
            >
              <span style={{ width: `${pct}%` }} />
            </div>
            <span className="nb-tk-batch-count">
              {task.batch.done}/{task.batch.total} · 成功 {task.batch.done - task.batch.failed} · 失败{' '}
              {task.batch.failed}
            </span>
          </div>
        ) : (
          <span className="nb-tk-row-status">{statusLabel(task)}</span>
        )}

        <button
          className={`nb-tk-toggle${paused ? '' : ' on'}`}
          role="switch"
          aria-checked={!paused}
          onClick={() => onToggle(task.id)}
          aria-label={paused ? '恢复任务' : '暂停任务'}
          data-testid={`task-toggle-${task.id}`}
        >
          <span className="nb-tk-toggle-knob" />
        </button>

        {isBatch && (
          <button
            className={`nb-tk-row-expand${expanded ? ' is-open' : ''}`}
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? '折叠子任务' : '展开子任务'}
            aria-expanded={expanded}
          >
            <Icons.chevD size={15} />
          </button>
        )}
      </div>

      {isBatch && task.batch && expanded && <BatchSubtasks batch={task.batch} />}
    </div>
  );
}
