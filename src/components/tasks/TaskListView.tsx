// Manager list view: flat task rows (Twitter-feed style, hairline separators,
// no per-row cards). Also exports the shared empty state used by every view.
//
// Change history:
//   2026-06-15  Replaced the one-liner empty state with a richer "inspire"
//               version: prominent template CTA + 3 example scenario chips.
import type { Task } from '../../types';
import { TaskRow } from './TaskRow';
import { Icons } from '../../icons/icons';
import { useAppStore } from '../../store/useAppStore';

// Three example scenarios shown as chips in the tasks empty state.
// These mirror the template catalog's top picks so one click jumps into
// the template picker pre-filtered to that category.
const EXAMPLE_CHIPS = [
  { icon: 'coins' as const, label: '盯黄金价格', color: 'var(--gold)', cat: 'monitor' },
  { icon: 'news' as const, label: 'HN 每日热榜', color: 'var(--brand-2)', cat: 'news' },
  { icon: 'bell' as const, label: '每日晨间简报', color: 'var(--success)', cat: 'schedule' },
] as const;

interface TasksEmptyProps {
  /** Open the template picker modal, optionally pre-filtered to a category. */
  onTemplate?: (categoryId?: string) => void;
}

export function TasksEmpty({ onTemplate }: TasksEmptyProps) {
  const openTasks = useAppStore((s) => s.openTasks);

  const handleTemplate = (cat?: string) => {
    if (onTemplate) {
      onTemplate(cat);
    } else {
      // Fallback: navigate to tasks page; the home screen has the template button.
      openTasks();
    }
  };

  return (
    <div className="nb-tk-empty nb-tk-empty--rich" data-testid="tasks-empty-state">
      <div className="nb-tk-empty-bee" aria-hidden>
        <Icons.bee size={28} />
      </div>
      <h3 className="nb-tk-empty-title">还没有任务</h3>
      <p className="nb-tk-empty-sub">
        说一句话或选一个模板，NanoBee 会自动帮你盯着，有动态就通知你
      </p>

      <button
        className="nb-tk-btn-primary nb-tk-empty-cta"
        onClick={() => handleTemplate('all')}
        data-testid="tasks-empty-template-btn"
      >
        <Icons.grid size={15} />
        从模板开始
      </button>

      <div className="nb-tk-empty-chips" data-testid="tasks-empty-chips">
        {EXAMPLE_CHIPS.map((chip) => {
          const Icon = Icons[chip.icon];
          return (
            <button
              key={chip.cat}
              className="nb-tk-empty-chip"
              onClick={() => handleTemplate(chip.cat)}
              data-testid={`tasks-empty-chip-${chip.cat}`}
            >
              <span className="nb-tk-empty-chip-ic" style={{ color: chip.color }}>
                <Icon size={13} />
              </span>
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TaskListView({
  tasks,
  onOpenTask,
  onToggle,
  onTemplate,
}: {
  tasks: Task[];
  onOpenTask: (id: string) => void;
  onToggle: (id: string) => void;
  onTemplate?: (categoryId?: string) => void;
}) {
  if (tasks.length === 0) return <TasksEmpty onTemplate={onTemplate} />;
  return (
    <div className="nb-tk-list" data-testid="tasks-list">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} onOpen={onOpenTask} onToggle={onToggle} />
      ))}
    </div>
  );
}
