// Clean single-focus first screen of the Tasks page: a quiet headline, the task
// composer (the one visual focus), and a subordinate running overview. All
// management complexity (view switch, filters, table/board, batch detail) lives
// one click away in the "all tasks" manager — never on this screen.
import { TaskComposer } from './TaskComposer';
import { TaskRunningOverview } from './TaskRunningOverview';

export function TasksHome({
  onOpenAll,
  onOpenTask,
  onUpload,
  onTemplate,
}: {
  onOpenAll: () => void;
  onOpenTask: (id: string) => void;
  onUpload: () => void;
  onTemplate: () => void;
}) {
  return (
    <div className="nb-tk-home" data-testid="tasks-home">
      <div className="nb-tk-home-inner">
        <h1 className="nb-tk-home-title">今天想让 NanoBee 帮你盯点什么？</h1>
        <p className="nb-tk-home-sub">说一句话，我就替你盯着，重要的时候主动通知你</p>
        <TaskComposer onUpload={onUpload} onTemplate={onTemplate} />
        <TaskRunningOverview onOpenAll={onOpenAll} onOpenTask={onOpenTask} />
      </div>
    </div>
  );
}
