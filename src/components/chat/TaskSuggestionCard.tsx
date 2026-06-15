// Inline task-suggestion card rendered below an AI reply when the
// NL→TriggerSpec compiler detected a monitoring/scheduling intent in the
// user's message. Shows the proposed task with its trigger label and lets
// the user accept (creates the task) or dismiss (removes the card).
//
// Accepting calls store.createTask which POSTs to /api/tasks with the
// embedded triggerSpec — the cron engine then evaluates it on every tick.
// Already-created state is detected via store.createdTaskIds (idempotent).
import { useState } from 'react';
import type { InlineSuggestion, TaskSuggestion } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';

interface Props {
  suggestion: InlineSuggestion;
}

/** Map a topic string to a display color (reuses the task icon-color palette). */
function topicColor(topic: string): string {
  const map: Record<string, string> = {
    gold: '#d4a64a',
    news: '#6366f1',
    brief: '#6366f1',
    health: '#1a7f55',
    edu: '#2563b3',
    tech: '#7c3aed',
  };
  return map[topic] ?? '#6366f1';
}

/** Display label for a trigger spec kind. */
function kindLabel(triggerSpec: InlineSuggestion['triggerSpec']): string {
  return triggerSpec.kind === 'schedule' ? '定时' : '条件监控';
}

/** Amber accent colors (same as proactive cards). */
const AMBER = 'var(--nb-amber)';

export function TaskSuggestionCard({ suggestion }: Props) {
  const createdTaskIds = useAppStore((s) => s.createdTaskIds);
  const createTask = useAppStore((s) => s.createTask);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isCreated = createdTaskIds.includes(suggestion.taskId);
  const iconColor = topicColor(suggestion.topic);

  const handleAccept = () => {
    if (isCreated) return;
    // Build the full TaskSuggestion shape expected by store.createTask.
    const taskSuggestion: TaskSuggestion = {
      id: suggestion.taskId,
      topicId: suggestion.topic,
      title: suggestion.title,
      iconColor,
      triggerType: suggestion.triggerSpec.kind === 'schedule' ? 'schedule' : 'condition',
      trigger: suggestion.triggerLabel,
      last: '从未',
      next: suggestion.triggerSpec.kind === 'schedule' ? '明天' : '监控中',
      desc: suggestion.message,
      kind: suggestion.triggerSpec.kind === 'schedule' ? 'schedule' : 'condition',
      config: [
        {
          icon: suggestion.triggerSpec.kind === 'schedule' ? 'clock' : 'bolt',
          label: suggestion.triggerLabel,
        },
      ],
      triggerSpec: suggestion.triggerSpec,
    };
    createTask(taskSuggestion);
  };

  return (
    <div className="nb-task-suggest" data-testid="task-suggestion-card">
      <div className="nb-task-suggest-head">
        <span className="nb-task-suggest-ico" style={{ background: AMBER }}>
          <Icons.bolt size={13} />
        </span>
        <span className="nb-task-suggest-label">NanoBee 可以帮你盯着这件事</span>
        {!isCreated && (
          <button
            type="button"
            className="nb-task-suggest-dismiss"
            onClick={() => setDismissed(true)}
            aria-label="关闭"
            data-testid="task-suggest-dismiss"
          >
            <Icons.x size={13} />
          </button>
        )}
      </div>

      <div className="nb-task-suggest-body">
        <div className="nb-task-suggest-row">
          <span
            className="nb-task-suggest-dot"
            style={{ background: iconColor }}
            aria-hidden
          />
          <span className="nb-task-suggest-title">{suggestion.title}</span>
          <span className={`nb-tk-badge tone-${suggestion.triggerSpec.kind === 'schedule' ? 'schedule' : 'condition'}`}>
            {kindLabel(suggestion.triggerSpec)}
          </span>
        </div>
        <div className="nb-task-suggest-trigger">
          <span className="nb-task-suggest-trigger-ic" aria-hidden>
            {suggestion.triggerSpec.kind === 'schedule'
              ? <Icons.clock size={12} />
              : <Icons.bolt size={12} />}
          </span>
          {suggestion.triggerLabel}
        </div>
        {suggestion.message && (
          <div className="nb-task-suggest-msg">{suggestion.message}</div>
        )}
      </div>

      <div className="nb-task-suggest-foot">
        {isCreated ? (
          <span className="nb-task-suggest-created" data-testid="task-suggest-created">
            <Icons.check size={13} /> 已创建，正在监控
          </span>
        ) : (
          <>
            <button
              type="button"
              className="nb-task-suggest-accept"
              onClick={handleAccept}
              data-testid="task-suggest-accept"
            >
              <Icons.bolt size={13} /> 创建监控任务
            </button>
            <span className="nb-task-suggest-hint">一键创建，随时可在任务页暂停</span>
          </>
        )}
      </div>
    </div>
  );
}
