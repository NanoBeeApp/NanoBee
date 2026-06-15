// Orchestrator for the Tasks page. Reads the URL (useTasksUrl) and renders one
// of two surfaces — the clean single-focus home screen or the "all tasks"
// manager — plus the detail drawer and the batch-upload dialog as overlays.
// Keeping the surface, view mode, open drawer and dialog in the URL makes every
// state bookmarkable and back-forward friendly (see useTasksUrl / tasks route).
import { useAppStore } from '../../store/useAppStore';
import { useTasksUrl } from './useTasksUrl';
import '../../styles/tasks.css';
import { TasksHome } from './TasksHome';
import { AllTasksView } from './AllTasksView';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { TaskUploadDialog } from './TaskUploadDialog';

export function TasksView() {
  const url = useTasksUrl();
  const tasks = useAppStore((s) => s.tasks);
  const toast = useAppStore((s) => s.toast);
  const onTemplate = () => toast('模板库开发中，先用一句话创建任务吧');

  return (
    <div className="nb-tk-page" data-testid="tasks-page">
      {url.surface === 'home' ? (
        <TasksHome
          onOpenAll={url.openAll}
          onOpenTask={url.openTask}
          onUpload={url.openUpload}
          onTemplate={onTemplate}
        />
      ) : (
        <AllTasksView url={url} onOpenTask={url.openTask} />
      )}

      {url.taskId && (
        <TaskDetailDrawer
          task={tasks.find((t) => t.id === url.taskId) ?? null}
          onClose={url.closeTask}
        />
      )}
      {url.uploadOpen && <TaskUploadDialog onClose={url.closeUpload} />}
    </div>
  );
}
