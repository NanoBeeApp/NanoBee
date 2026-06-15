// The quiet "正在为你运行" block under the composer: at most a few read-only
// rows (status dot + title + one gray status line) plus a "查看全部 →" link into
// the manager. It deliberately carries no toggles / badges / menus — it must
// stay subordinate to the composer (the home screen's single focus). When the
// user has no tasks it renders nothing, so a new user sees only the composer.
import { useAppStore } from '../../store/useAppStore';
import { TaskStatusDot } from './TaskStatusDot';
import { statusLabel } from './taskMeta';
import { Icons } from '../../icons/icons';

const HOME_PREVIEW_COUNT = 4;

export function TaskRunningOverview({
  onOpenAll,
  onOpenTask,
}: {
  onOpenAll: () => void;
  onOpenTask: (id: string) => void;
}) {
  const tasks = useAppStore((s) => s.tasks);
  if (tasks.length === 0) return null;

  const preview = tasks.slice(0, HOME_PREVIEW_COUNT);

  return (
    <section className="nb-tk-overview" data-testid="tasks-overview">
      <div className="nb-tk-overview-head">
        <span className="nb-tk-overview-title">正在为你运行</span>
        <button className="nb-tk-overview-all" onClick={onOpenAll} data-testid="tasks-open-all">
          查看全部 {tasks.length} 个任务 <Icons.arrowRight size={13} />
        </button>
      </div>
      <ul className="nb-tk-overview-list">
        {preview.map((t) => (
          <li key={t.id}>
            <button
              className="nb-tk-overview-row"
              onClick={() => onOpenTask(t.id)}
              data-testid={`tasks-overview-row-${t.id}`}
            >
              <TaskStatusDot task={t} />
              <span className="nb-tk-overview-row-title">{t.title}</span>
              <span className="nb-tk-overview-row-meta">{t.result ?? statusLabel(t)}</span>
              <Icons.chevR size={14} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
