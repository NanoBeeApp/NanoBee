// Orchestrator for the Tasks page. Reads the URL (useTasksUrl) and renders one
// of two surfaces — the clean single-focus home screen or the "all tasks"
// manager — plus the detail drawer, the batch-upload dialog, and the template
// picker modal as overlays.
// Keeping the surface, view mode, open drawer, dialogs, and template picker
// in the URL makes every state bookmarkable and back-forward friendly
// (see useTasksUrl / tasks route).
//
// Change history:
//   2026-06-15  Wired TaskTemplateModal: replaced the toast stub with a real
//               URL-driven modal opened via url.openTemplate().
import { useAppStore } from '../../store/useAppStore';
import { useTasksUrl } from './useTasksUrl';
import '../../styles/tasks.css';
import { TasksHome } from './TasksHome';
import { AllTasksView } from './AllTasksView';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { TaskUploadDialog } from './TaskUploadDialog';
import { TaskTemplateModal } from './TaskTemplateModal';

export function TasksView() {
  const url = useTasksUrl();
  const tasks = useAppStore((s) => s.tasks);

  return (
    <div className="nb-tk-page" data-testid="tasks-page">
      {url.surface === 'home' ? (
        <TasksHome
          onOpenAll={url.openAll}
          onOpenTask={url.openTask}
          onUpload={url.openUpload}
          onTemplate={() => url.openTemplate()}
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
      {url.tplCategory !== null && (
        <TaskTemplateModal
          activeCategoryId={url.tplCategory}
          onChangeCategory={url.setTplCategory}
          onClose={url.closeTemplate}
        />
      )}
    </div>
  );
}
