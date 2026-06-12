// Task proposal card inside an AI reply — the main "create a task from chat"
// flow. Configuration is collapsed into chips; one click confirms.
import type { TaskSuggestion } from '../../types';
import { Icons } from '../../icons/icons';

interface TaskSuggestCardProps {
  d: TaskSuggestion;
  created: boolean;
  onCreate: (d: TaskSuggestion) => void;
}

export function TaskSuggestCard({ d, created, onCreate }: TaskSuggestCardProps) {
  return (
    <div className="nb-task-suggest" data-testid="task-suggest-card">
      <div className="row1">
        <div className="tk-ico"><Icons.bolt size={16} /></div>
        <div style={{ flex: 1 }}>
          <div className="tk-title">{d.title}</div>
          <div className="tk-desc">{d.desc}</div>
        </div>
      </div>
      <div className="nb-task-config">
        {d.config.map((c, i) => (
          <span className="nb-chip" key={i}>
            <span className="ic">{c.icon === 'clock' ? <Icons.clock size={12} /> : <Icons.bolt size={12} />}</span>
            {c.label}
          </span>
        ))}
      </div>
      <div className="nb-task-actions">
        {created ? (
          <button className="btn btn-secondary btn-sm" disabled style={{ gap: 6 }} data-testid="task-created-confirmation">
            <Icons.check size={13} /> 已创建任务
          </button>
        ) : (
          <>
            <button className="btn btn-primary btn-sm" onClick={() => onCreate(d)}
              style={{ gap: 6, background: 'var(--nb-amber)' }} data-testid="create-task-from-chat">
              <Icons.plus size={13} /> 创建任务
            </button>
            <button className="btn btn-ghost btn-sm" data-testid="adjust-task-settings">调整设置</button>
            <button className="btn btn-ghost btn-sm" data-testid="defer-task-creation">稍后</button>
          </>
        )}
      </div>
    </div>
  );
}
