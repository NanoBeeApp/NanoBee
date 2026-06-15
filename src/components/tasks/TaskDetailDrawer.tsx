// Right-side detail drawer (role=dialog) for one task: header (title + status +
// kind + topic), the trigger/action config rows, the schedule/run-time meta row
// (last run · next run), the run-history timeline, the latest output, and the
// action bar (run once / pause-resume / edit / delete).
// Opened via the URL ?task=id so it survives refresh and deep links. "Run once"
// and "edit" are stubbed to toasts — those backends are a later concern; pause
// and delete are wired to the real store actions.
import { useEffect, type ReactNode } from 'react';
import type { Task, TriggerSpec } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { TaskTypeBadge } from './TaskTypeBadge';
import { statusLabel, statusTone } from './taskMeta';
import { TOPICS } from '../../data/topics';
import { Icons } from '../../icons/icons';

function ConfigRow({ icon, label, testid }: { icon: ReactNode; label: string; testid?: string }) {
  return (
    <div className="nb-tk-config-row" data-testid={testid}>
      <span className="nb-tk-config-icon">{icon}</span>
      <span className="nb-tk-config-label">{label}</span>
    </div>
  );
}

/** Human-readable summary of a TriggerSpec for the trigger section. */
function triggerSpecLabel(spec: TriggerSpec): string {
  if (spec.kind === 'schedule') {
    return spec.label || `每天 ${String(spec.hour).padStart(2, '0')}:${String(spec.minute).padStart(2, '0')} UTC`;
  }
  // condition
  const opMap: Record<string, string> = { gt: '>', lt: '<', gte: '≥', lte: '≤', changed: '变化时' };
  const opStr = opMap[spec.op] ?? spec.op;
  if (spec.op === 'changed') {
    return `监控 ${spec.sourceId} · ${spec.metric} 变化时触发`;
  }
  return `监控 ${spec.sourceId} · ${spec.metric} ${opStr} ${spec.threshold ?? ''}`;
}

export function TaskDetailDrawer({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const toggleTask = useAppStore((s) => s.toggleTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const toast = useAppStore((s) => s.toast);

  // Close on Escape (overlay convention + a11y).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!task) return null;

  const topic = TOPICS.find((t) => t.id === task.topicId);
  const paused = task.status === 'paused';
  const onDelete = () => {
    deleteTask(task.id);
    onClose();
  };

  // triggerSpec is now surfaced on the Task type (added to types.ts and repo.ts
  // in the wiring pass). When present it drives a structured trigger summary;
  // the human-readable trigger string is the fallback for seed/legacy tasks.
  const triggerSpec: TriggerSpec | undefined = task.triggerSpec;

  return (
    <>
      <div className="nb-tk-scrim" onClick={onClose} data-testid="task-detail-scrim" />
      <aside
        className="nb-tk-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="任务详情"
        data-testid="task-detail-drawer"
      >
        <div className="nb-tk-drawer-head">
          <h2 className="nb-tk-drawer-title">{task.title}</h2>
          <button className="nb-tk-drawer-x" onClick={onClose} aria-label="关闭">
            <Icons.x size={16} />
          </button>
        </div>
        <div className="nb-tk-drawer-tags">
          <span className={`nb-tk-pill tone-${statusTone(task)}`} data-testid="task-detail-status">
            {statusLabel(task)}
          </span>
          <TaskTypeBadge task={task} />
          {topic && <span className="nb-tk-drawer-topic">{topic.name}</span>}
        </div>

        <div className="nb-tk-drawer-body">
          {/* Trigger & action section */}
          <div className="nb-tk-drawer-section">
            <div className="nb-tk-drawer-h">触发与动作</div>
            {/* Prefer the structured triggerSpec summary over the raw trigger string */}
            {triggerSpec ? (
              <ConfigRow
                icon={triggerSpec.kind === 'schedule' ? <Icons.calendar size={14} /> : <Icons.bolt size={14} />}
                label={triggerSpecLabel(triggerSpec)}
                testid="task-detail-triggerspec"
              />
            ) : (
              <ConfigRow
                icon={<Icons.clock size={14} />}
                label={task.trigger}
                testid="task-detail-trigger"
              />
            )}
            {task.config?.map((c, i) => (
              <ConfigRow
                key={i}
                icon={c.icon === 'clock' ? <Icons.clock size={14} /> : <Icons.bolt size={14} />}
                label={c.label}
              />
            ))}
          </div>

          {/* Schedule / run-time meta */}
          {(task.last || task.next) && (
            <div className="nb-tk-drawer-section">
              <div className="nb-tk-drawer-h">计划与记录</div>
              {task.last && (
                <ConfigRow
                  icon={<Icons.clock size={14} />}
                  label={`上次运行：${task.last}`}
                  testid="task-detail-last-run"
                />
              )}
              {task.next && (
                <ConfigRow
                  icon={<Icons.calendar size={14} />}
                  label={`下次运行：${task.next}`}
                  testid="task-detail-next-run"
                />
              )}
            </div>
          )}

          {/* Run history timeline */}
          {task.history && task.history.length > 0 && (
            <div className="nb-tk-drawer-section">
              <div className="nb-tk-drawer-h">运行历史</div>
              <ul className="nb-tk-timeline" data-testid="task-detail-history">
                {task.history.map((r, i) => (
                  <li
                    key={i}
                    className={`nb-tk-trun tone-${r.status === 'success' ? 'active' : 'failed'}`}
                    data-testid={`task-history-row-${i}`}
                  >
                    <span className="nb-tk-trun-dot" aria-hidden />
                    <span className="nb-tk-trun-time">{r.time}</span>
                    <span className="nb-tk-trun-sum">{r.summary}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Latest output */}
          {task.result && (
            <div className="nb-tk-drawer-section">
              <div className="nb-tk-drawer-h">最近产出</div>
              <div className="nb-tk-drawer-output" data-testid="task-detail-result">{task.result}</div>
            </div>
          )}
        </div>

        <div className="nb-tk-drawer-actions">
          <button
            className="nb-tk-btn-primary"
            onClick={() => toast('已触发运行一次')}
            data-testid="task-run-now"
          >
            立即运行一次
          </button>
          <button
            className="nb-tk-btn"
            onClick={() => toggleTask(task.id)}
            data-testid="task-toggle-pause"
            aria-label={paused ? '恢复任务' : '暂停任务'}
          >
            {paused ? '恢复' : '暂停'}
          </button>
          <button
            className="nb-tk-btn"
            onClick={() => toast('编辑面板开发中')}
            data-testid="task-edit"
          >
            编辑
          </button>
          <button className="nb-tk-btn-danger" onClick={onDelete} data-testid="task-delete">
            删除
          </button>
        </div>
      </aside>
    </>
  );
}
