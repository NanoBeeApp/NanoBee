// Manager toolbar: a back link to the home screen, the title + run summary,
// then the view switch (list/table/board), kind filter chips and a search box.
// Pure render — all state is owned by AllTasksView / the URL.
import type { Task } from '../../types';
import type { TasksViewMode } from '../../routes/_app/tasks';
import { Icons } from '../../icons/icons';

const VIEW_MODES: { vm: TasksViewMode; label: string }[] = [
  { vm: 'list', label: '列表' },
  { vm: 'table', label: '表格' },
  { vm: 'board', label: '看板' },
];

const FILTERS: { v: string; label: string }[] = [
  { v: 'all', label: '全部' },
  { v: 'schedule', label: '定时' },
  { v: 'condition', label: '监控' },
  { v: 'oneoff', label: '一次性' },
  { v: 'batch', label: '批量' },
];

export function TasksToolbar({
  tasks,
  vm,
  filter,
  search,
  onBack,
  onVm,
  onFilter,
  onSearch,
}: {
  tasks: Task[];
  vm: TasksViewMode;
  filter: string;
  search: string;
  onBack: () => void;
  onVm: (vm: TasksViewMode) => void;
  onFilter: (f: string) => void;
  onSearch: (q: string) => void;
}) {
  const active = tasks.filter((t) => t.status === 'active').length;
  const paused = tasks.length - active;

  return (
    <div className="nb-tk-manager-head">
      <button className="nb-tk-back" onClick={onBack} data-testid="tasks-back">
        <Icons.chevR size={14} /> 返回
      </button>
      <div className="nb-tk-manager-titleline">
        <h1 className="nb-tk-manager-title">全部任务</h1>
        <span className="nb-tk-manager-sum" data-testid="tasks-summary">
          {tasks.length === 0
            ? '还没有任务'
            : `${active} 个运行中${paused > 0 ? ` · ${paused} 个已暂停` : ''}`}
        </span>
      </div>

      <div className="nb-tk-toolbar" data-testid="tasks-toolbar">
        <div className="nb-tk-vmswitch" role="tablist" aria-label="视图切换">
          {VIEW_MODES.map((m) => (
            <button
              key={m.vm}
              role="tab"
              aria-selected={vm === m.vm}
              className={`nb-tk-vm${vm === m.vm ? ' active' : ''}`}
              onClick={() => onVm(m.vm)}
              data-testid={`tasks-view-switch-${m.vm}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="nb-tk-filters">
          {FILTERS.map((f) => (
            <button
              key={f.v}
              className={`nb-tk-fchip${filter === f.v ? ' active' : ''}`}
              aria-pressed={filter === f.v}
              onClick={() => onFilter(f.v)}
              data-testid={`tasks-filter-${f.v}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="nb-tk-search">
          <Icons.search size={14} />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="搜索任务"
            aria-label="搜索任务"
            data-testid="tasks-search"
          />
        </div>
      </div>
    </div>
  );
}
