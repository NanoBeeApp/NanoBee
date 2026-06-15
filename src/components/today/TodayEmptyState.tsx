// Empty state for the Today feed — shown when there are no proactive updates
// yet (either no tasks have fired, or no updates match the active filter).
//
// Two cases:
//  - Global empty (no tasks have ever produced an update): explains what the
//    feed is for and shows a CTA to create the user's first task.
//  - Filter empty (tasks exist but none match the active topic filter): a
//    quieter "nothing here yet" message that doesn't push users to create.
//
// Design: white background, honey/amber CTA, Radix tokens, no dark elements.
// Matches the nb-alldone aesthetic already used in TodayView but enriched
// with explanatory copy and a navigation action.
//
// Change history:
//   2026-06-15  Initial implementation.

import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';

interface TodayEmptyStateProps {
  /** True when a topic filter is active (so this is a filtered-empty, not truly empty). */
  hasFilter: boolean;
}

export function TodayEmptyState({ hasFilter }: TodayEmptyStateProps) {
  const openTasks = useAppStore((s) => s.openTasks);
  const tasks = useAppStore((s) => s.tasks);
  const hasAnyTasks = tasks.length > 0;

  if (hasFilter) {
    // Filtered empty: the user has tasks but nothing for this topic yet.
    return (
      <div className="nb-alldone nb-today-empty" data-testid="today-filter-empty">
        <div className="big"><Icons.check size={28} /></div>
        <h3>这个话题暂无动态</h3>
        <p>切换到「全部」查看所有更新，或等 NanoBee 发现新内容。</p>
      </div>
    );
  }

  if (hasAnyTasks) {
    // Tasks exist but haven't fired yet (scheduler hasn't run, or conditions
    // haven't been met).
    return (
      <div className="nb-alldone nb-today-empty" data-testid="today-waiting-empty">
        <div className="big nb-today-empty-bee"><Icons.bee size={28} /></div>
        <h3>NanoBee 正在帮你盯着</h3>
        <p>
          有新的重要动态时，我会第一时间放到这里并通知你。
          <br />
          稍等片刻，或者再添加几个任务。
        </p>
        <button
          className="nb-today-empty-cta"
          onClick={openTasks}
          data-testid="today-empty-open-tasks"
        >
          <Icons.bolt size={14} />
          查看我的任务
        </button>
      </div>
    );
  }

  // Truly empty: new user with no tasks at all. Explain the feed purpose and
  // guide them to create a task.
  return (
    <div className="nb-alldone nb-today-empty" data-testid="today-new-user-empty">
      <div className="big nb-today-empty-bee"><Icons.bee size={28} /></div>
      <h3>还没有任何动态</h3>
      <p>
        NanoBee 会帮你盯着你关心的事：价格变动、资讯热点、定时提醒……
        <br />
        一旦有重要动态，就会自动出现在这里并通知你。
      </p>
      <button
        className="nb-today-empty-cta nb-today-empty-cta--primary"
        onClick={openTasks}
        data-testid="today-empty-create-task"
      >
        <Icons.bolt size={14} />
        创建我的第一个任务
      </button>
    </div>
  );
}
