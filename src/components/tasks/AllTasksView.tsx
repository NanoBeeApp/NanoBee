// The secondary "all tasks" manager, reached from the home screen's "查看全部 →".
// This is where all management complexity lives — view switch, filters, search,
// table/board, batch detail — kept off the clean home screen. Stateful wrapper:
// owns the search text, reads the view mode / filter from the URL, applies the
// kind filter + text search, and renders the toolbar + the active view.
//
// Change history:
//   2026-06-15  Passes onTemplate to TaskListView so the rich empty state can
//               open the template picker directly.
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { TasksUrl } from './useTasksUrl';
import { TasksToolbar } from './TasksToolbar';
import { TaskListView } from './TaskListView';
import { TaskTableView } from './TaskTableView';
import { TaskBoardView } from './TaskBoardView';
import { taskKind } from './taskMeta';

export function AllTasksView({
  url,
  onOpenTask,
}: {
  url: TasksUrl;
  onOpenTask: (id: string) => void;
}) {
  const tasks = useAppStore((s) => s.tasks);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const [search, setSearch] = useState('');

  const q = search.trim();
  const filtered = tasks.filter((t) => {
    if (url.filter !== 'all' && taskKind(t) !== url.filter) return false;
    if (q && !t.title.includes(q) && !t.trigger.includes(q)) return false;
    return true;
  });

  // Forward to the template picker with the chosen category pre-selected.
  const handleTemplate = (cat?: string) => {
    url.openTemplate(cat ?? 'all');
  };

  return (
    <div className="nb-tk-manager" data-testid="tasks-all">
      <div className="nb-tk-manager-inner">
        <TasksToolbar
          tasks={tasks}
          vm={url.vm}
          filter={url.filter}
          search={search}
          onBack={url.openHome}
          onVm={url.setVm}
          onFilter={url.setFilter}
          onSearch={setSearch}
        />
        {url.vm === 'list' && (
          <TaskListView
            tasks={filtered}
            onOpenTask={onOpenTask}
            onToggle={toggleTask}
            onTemplate={handleTemplate}
          />
        )}
        {url.vm === 'table' && (
          <TaskTableView tasks={filtered} onOpenTask={onOpenTask} onToggle={toggleTask} />
        )}
        {url.vm === 'board' && <TaskBoardView tasks={filtered} onOpenTask={onOpenTask} />}
      </div>
    </div>
  );
}
