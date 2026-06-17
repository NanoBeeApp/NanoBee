// tpModel.ts — maps a real domain `Task` onto the Tasks-page view-model the
// design components consume, plus the page's shared constants. Keeping all the
// field derivation (status → attention, kind → type/typeLabel, batch → children,
// payload-carried enrichment → drawer fields) in one place means the row / card /
// table / kanban / drawer renderers stay pure and read from a single source.
//
// Everything is derived from real fields with graceful fallbacks, so the page
// works on the plain seed tasks and lights up its richer states (monitor card,
// failure block, run history) whenever a task's payload carries them.
import type { IconName, ResultTone, Task } from '../../types';
import { topicById, topicShortName } from '../../data/topics';

/** Enabled+execution status collapsed to the three the page renders. */
export type TpStatus = 'active' | 'paused' | 'attention';
/** Trigger family driving the type badge. */
export type TpType = 'schedule' | 'condition' | 'batch';
/** One run-history entry (the design also has partial/skipped; real data is binary). */
export type TpRunStatus = 'success' | 'partial' | 'skipped' | 'fail';

export interface TpChild { name: string; note: string; status: 'ok' | 'fail'; }
export interface TpRun { time: string; status: TpRunStatus; summary: string; }

/** The shape every Tasks-page renderer reads. */
export interface TaskVM {
  id: string;
  title: string;
  status: TpStatus;
  type: TpType;
  typeLabel: string;
  trigger: string;
  result?: string;
  resultTone: ResultTone;
  next: string;
  last: string;
  icon: IconName;
  iconColor: string;
  topicName: string;
  featured: boolean;
  // batch
  children?: TpChild[];
  batchDone: number;
  batchFail: number;
  batchCount: number;
  // monitor (dark live card) — only set when the task carries metric data
  monitor: boolean;
  metric?: { label: string; value: string; dir: 'up' | 'down'; delta: string };
  spark?: number[];
  // drawer
  nlSpec: string;
  cooldown: string;
  channel: string;
  source: string;
  runs: number;
  successRate: string;
  runHistory: TpRun[];
  failure?: { reason: string; fix: string };
  /** The original task, for store actions that need the full object. */
  raw: Task;
}

const TYPE_LABEL: Record<TpType, string> = { schedule: '定时', condition: '条件', batch: '批量' };

/** Status chip metadata (label + badge class + kanban dot color). */
export const TP_STAT: Record<TpStatus, { label: string; badge: TpStatus; kdot: string }> = {
  active: { label: '运行中', badge: 'active', kdot: 'var(--success)' },
  paused: { label: '已暂停', badge: 'paused', kdot: 'var(--ink-4)' },
  attention: { label: '需处理', badge: 'attention', kdot: 'var(--danger)' },
};

/** Run-history status → label. */
export const TP_RUN: Record<TpRunStatus, string> = {
  success: '成功',
  partial: '部分成功',
  skipped: '已跳过',
  fail: '失败',
};

/** Create-bar quick suggestions. */
export const TP_SUGGEST: { ic: IconName; t: string }[] = [
  { ic: 'bolt', t: '黄金跌超 2% 提醒我' },
  { ic: 'news', t: '每天 8 点给我科技要闻' },
  { ic: 'up', t: '上传清单，批量盯梢' },
  { ic: 'globe', t: '这个网页有更新就告诉我' },
];

/** Result dot color by tone. */
export function toneColor(t: ResultTone | undefined): string {
  return t === 'down' ? 'var(--danger)' : t === 'up' ? 'var(--success)' : 'var(--info)';
}

/** Seconds → a short Chinese cooldown label ("2 小时" / "30 分钟"). */
function cooldownLabel(seconds: number | undefined): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  if (seconds % 3600 === 0) return `${seconds / 3600} 小时`;
  if (seconds % 60 === 0) return `${seconds / 60} 分钟`;
  return `${seconds} 秒`;
}

/** Derive the type family for the badge. */
function deriveType(task: Task): TpType {
  if (task.batch || task.kind === 'batch') return 'batch';
  if (task.kind === 'schedule') return 'schedule';
  if (task.kind === 'condition') return 'condition';
  return task.triggerType === 'schedule' ? 'schedule' : 'condition';
}

/** Map one `Task` to the page view-model with graceful fallbacks. */
export function toTaskVm(task: Task): TaskVM {
  const topic = topicById(task.topicId);
  const type = deriveType(task);
  const status: TpStatus = task.runState === 'failed' ? 'attention' : task.status;

  const children: TpChild[] | undefined = task.batch?.subtasks?.map((s) => ({
    name: s.input,
    note: s.result ?? (s.status === 'failed' ? '失败' : s.status === 'running' ? '运行中' : s.status === 'queued' ? '排队中' : '成功'),
    status: s.status === 'failed' ? 'fail' : 'ok',
  }));

  const runHistory: TpRun[] = task.history?.length
    ? task.history.map((h) => ({
        time: h.time,
        status: h.status === 'failed' ? 'fail' : 'success',
        summary: h.summary,
      }))
    : task.result
      ? [{ time: task.last, status: status === 'attention' ? 'fail' : 'success', summary: task.result }]
      : [];

  const failure =
    task.failure ??
    (status === 'attention'
      ? { reason: task.result ?? '任务最近一次运行失败，待处理。', fix: '可以在对话里告诉我新的口径，我会更新触发规则后重跑。' }
      : undefined);

  const spec = task.triggerSpec;
  const cooldown =
    task.cooldown ??
    (spec && spec.kind === 'condition' ? cooldownLabel(spec.cooldownSeconds) : undefined) ??
    '—';
  const source =
    task.source ??
    (spec && spec.kind === 'condition' ? `NanoBee data-hub · ${spec.sourceId}` : undefined) ??
    'NanoBee data-hub';

  return {
    id: task.id,
    title: task.title,
    status,
    type,
    typeLabel: TYPE_LABEL[type],
    trigger: task.trigger,
    result: task.result,
    resultTone: task.resultTone ?? 'info',
    next: task.next,
    last: task.last,
    icon: task.monitor ? 'trend' : topic?.icon ?? (type === 'schedule' ? 'clock' : 'bolt'),
    iconColor: task.iconColor || topic?.color || '#d98b2b',
    topicName: topic ? topicShortName(topic) : '',
    featured: task.featured ?? false,
    children,
    batchDone: task.batch?.done ?? 0,
    batchFail: task.batch?.failed ?? 0,
    batchCount: task.batch?.total ?? 0,
    monitor: !!(task.monitor && task.metric),
    metric: task.metric,
    spark: task.spark,
    nlSpec: task.nlSpec ?? task.desc ?? task.trigger,
    cooldown,
    channel: task.channel ?? '事项页',
    source,
    runs: task.runs ?? task.history?.length ?? 0,
    successRate: task.successRate ?? '—',
    runHistory,
    failure,
    raw: task,
  };
}

/**
 * The featured "重点盯梢" strip: explicit `featured` tasks if any are flagged,
 * otherwise the active monitors (a meaningful high-frequency subset rather than
 * the whole list). Returns at most `cap` cards.
 */
export function featuredTasks(vms: TaskVM[], cap = 6): TaskVM[] {
  const flagged = vms.filter((v) => v.featured);
  const pool = flagged.length ? flagged : vms.filter((v) => v.status === 'active');
  return pool.slice(0, cap);
}
