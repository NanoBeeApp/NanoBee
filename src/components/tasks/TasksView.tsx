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
//   2026-06-15  Pass onBatchCreated to TaskUploadDialog: on success, navigate
//               to the all-tasks list with the new batch task's drawer open.
import { useCallback } from 'react';
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
  const bootstrap = useAppStore((s) => s.bootstrap);

  // After a batch is created: close the upload dialog, refresh task list from
  // the server, navigate to the all-tasks manager and open the new batch's
  // detail drawer so the user can see progress immediately.
  const handleBatchCreated = useCallback(async (batchId: string) => {
    url.closeUpload();
    // Refresh the task list so the newly created batch row appears
    await bootstrap();
    // Navigate to all-tasks with the new batch task open
    url.openTask(batchId);
  }, [url, bootstrap]);

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
      {url.uploadOpen && (
        <TaskUploadDialog
          onClose={url.closeUpload}
          onBatchCreated={(id) => void handleBatchCreated(id)}
        />
      )}
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
