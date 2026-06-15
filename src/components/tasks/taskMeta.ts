// Display helpers shared by every task surface (home overview, list, table,
// board, detail drawer). Deriving the kind, the badge label/tone, the status
// dot tone and the short status line in one place keeps the views consistent
// and free of inline branching.
import type { Task, TaskKind } from '../../types';

/** Derive the higher-level kind: an explicit `kind` wins, else map from
 *  triggerType (schedule → schedule, condition → condition). */
export function taskKind(t: Task): TaskKind {
  if (t.kind) return t.kind;
  return t.triggerType === 'schedule' ? 'schedule' : 'condition';
}

export type KindTone = 'schedule' | 'condition' | 'oneoff' | 'batch';

interface KindMeta {
  /** Badge text. */
  label: string;
  tone: KindTone;
}

const KIND_META: Record<TaskKind, KindMeta> = {
  schedule: { label: '定时', tone: 'schedule' },
  condition: { label: '监控', tone: 'condition' },
  oneoff: { label: '一次性', tone: 'oneoff' },
  batch: { label: '批量', tone: 'batch' },
};

export function kindMeta(t: Task): KindMeta {
  return KIND_META[taskKind(t)];
}

export type StatusTone = 'active' | 'paused' | 'running' | 'failed' | 'done';

/** The status-dot tone. paused / failed / done / running take priority over the
 *  plain enabled 'active' state. */
export function statusTone(t: Task): StatusTone {
  if (t.status === 'paused') return 'paused';
  if (t.runState) return t.runState; // 'running' | 'failed' | 'done'
  return 'active';
}

/** Short human status text for the right edge of a row / a table cell. */
export function statusLabel(t: Task): string {
  switch (statusTone(t)) {
    case 'paused':
      return '已暂停';
    case 'failed':
      return '运行异常';
    case 'done':
      return '已完成';
    case 'running':
      return t.batch ? `进行中 ${t.batch.done}/${t.batch.total}` : '进行中';
    default:
      return t.next || '运行中';
  }
}
