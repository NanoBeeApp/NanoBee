// Expanded child rows under a batch task: progress bar with done/failed counts,
// a scrollable subtask list (input, status dot, result summary / error, per-row
// retry), "retry only failed" action, CSV export. Polls GET /api/tasks/batch/:id
// while the batch is still running; stops when all rows are done or failed.
//
// Change history:
//   2026-06-15  Full rewrite: backed by real /api/tasks/batch/:id endpoint,
//               polling, retry-failed action, CSV blob download.
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Task } from '../../types';
import { Icons } from '../../icons/icons';
import { useAppStore } from '../../store/useAppStore';

// ---------------------------------------------------------------------------
// Types from the GET /api/tasks/batch/:id wire shape
// ---------------------------------------------------------------------------

interface SubtaskWire {
  id: string;
  input: string;
  status: 'queued' | 'running' | 'success' | 'failed';
  result?: string;
  attempts?: number;
}

interface BatchProgressWire {
  total: number;
  pending: number;
  running: number;
  done: number;
  failed: number;
}

interface BatchDetailWire {
  task: Task & {
    batch: {
      total: number;
      done: number;
      failed: number;
      pending: number;
      running: number;
      subtasks: SubtaskWire[];
    };
  };
  progress: BatchProgressWire;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_TONE: Record<string, string> = {
  queued: 'paused',
  running: 'running',
  success: 'active',
  failed: 'failed',
};

const STATUS_LABEL: Record<string, string> = {
  queued: '排队中',
  running: '运行中',
  success: '成功',
  failed: '失败',
};

const POLL_MS = 3000;

function isComplete(p: BatchProgressWire): boolean {
  return p.pending === 0 && p.running === 0 && p.total > 0;
}

function toCsv(rows: SubtaskWire[]): string {
  const header = ['input', 'status', 'result'].join(',');
  const lines = rows.map((r) => {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [escape(r.input), escape(STATUS_LABEL[r.status] ?? r.status), escape(r.result ?? '')].join(',');
  });
  return [header, ...lines].join('\n');
}

function downloadCsv(rows: SubtaskWire[], filename: string) {
  const csv = toCsv(rows);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ---------------------------------------------------------------------------
// BatchSubtasks component
// ---------------------------------------------------------------------------

export function BatchSubtasks({ task }: { task: Task }) {
  const toast = useAppStore((s) => s.toast);

  // Local live data (overrides whatever the task prop carries once we start
  // fetching live data).
  const [liveData, setLiveData] = useState<BatchDetailWire | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Derived subtask list: prefer live data, fall back to task.batch.subtasks
  const subtasks = liveData?.task.batch?.subtasks ?? task.batch?.subtasks ?? [];
  const progress = liveData?.progress ?? {
    total: task.batch?.total ?? 0,
    done: task.batch?.done ?? 0,
    failed: task.batch?.failed ?? 0,
    pending: 0,
    running: 0,
  };

  // ------------------------------------------------------------------
  // Fetch
  // ------------------------------------------------------------------

  const fetchBatch = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      const res = await fetch(`/api/tasks/batch/${encodeURIComponent(task.id)}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as BatchDetailWire;
      if (!mountedRef.current) return;
      setLiveData(data);
      setLoadError(null);

      // Keep polling if work is still in progress
      if (!isComplete(data.progress)) {
        pollRef.current = setTimeout(() => { void fetchBatch(); }, POLL_MS);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setLoadError(String(err));
    }
  }, [task.id]);

  // Start polling on mount (and whenever the task id changes)
  useEffect(() => {
    mountedRef.current = true;
    void fetchBatch();
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [fetchBatch]);

  // ------------------------------------------------------------------
  // Retry failed
  // ------------------------------------------------------------------

  const retryFailed = async () => {
    setRetrying(true);
    try {
      const res = await fetch(`/api/tasks/batch/${encodeURIComponent(task.id)}/retry-failed`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { ok: boolean; resetCount: number };
      toast(data.resetCount > 0 ? `已重置 ${data.resetCount} 条，重新运行中…` : '没有需要重试的子任务');
      // Kick off a fresh poll cycle
      if (pollRef.current) clearTimeout(pollRef.current);
      pollRef.current = setTimeout(() => { void fetchBatch(); }, 800);
    } catch (err) {
      toast(`重试失败：${String(err)}`);
    } finally {
      setRetrying(false);
    }
  };

  // Per-row retry (same endpoint; only one row reset — simplest UX for now)
  const retryRow = async (subtaskId: string) => {
    // We optimistically patch the local view so the UI reacts immediately
    setLiveData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        task: {
          ...prev.task,
          batch: {
            ...prev.task.batch,
            subtasks: prev.task.batch.subtasks.map((s) =>
              s.id === subtaskId ? { ...s, status: 'queued' as const } : s,
            ),
          },
        },
      };
    });
    // Then fire the global retry-failed (server resets all failed; acceptable for MVP)
    await retryFailed();
  };

  // ------------------------------------------------------------------
  // Export
  // ------------------------------------------------------------------

  const exportCsv = () => {
    const name = `batch-${task.id}-results.csv`;
    downloadCsv(subtasks as SubtaskWire[], name);
  };

  // ------------------------------------------------------------------
  // Progress bar
  // ------------------------------------------------------------------

  const pct = progress.total > 0
    ? Math.round(((progress.done + progress.failed) / progress.total) * 100)
    : 0;
  const done = isComplete(progress);

  const hasFailed = progress.failed > 0;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="nb-tk-batch-detail" data-testid="task-subtasks">
      {/* Progress summary bar */}
      <div className="nb-tk-batch-progress-row">
        <div
          className="nb-tk-progress"
          role="progressbar"
          aria-valuenow={progress.done + progress.failed}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-label="批量进度"
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="nb-tk-batch-progress-meta">
          <span className="nb-tk-batch-stat">
            {progress.done + progress.failed}/{progress.total} 完成
          </span>
          {progress.done > 0 && (
            <span className="nb-tk-batch-stat" style={{ color: 'var(--success)' }}>
              ✓ {progress.done} 成功
            </span>
          )}
          {hasFailed && (
            <span className="nb-tk-batch-stat" style={{ color: 'var(--danger)' }}>
              ✕ {progress.failed} 失败
            </span>
          )}
          {!done && (progress.running > 0 || progress.pending > 0) && (
            <span className="nb-tk-batch-stat" style={{ color: 'var(--warning)' }}>
              ⋯ {progress.running + progress.pending} 待处理
            </span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {loadError && (
        <div
          style={{
            padding: '7px 12px',
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            borderRadius: 'var(--r-2)',
            fontSize: 12,
            margin: '4px 0',
          }}
        >
          {loadError}
        </div>
      )}

      {/* Subtask list */}
      {subtasks.length > 0 && (
        <ul className="nb-tk-subtasks">
          {subtasks.map((s) => (
            <li
              key={s.id}
              className="nb-tk-subtask"
              data-testid={`task-subtask-${s.id}`}
            >
              <span
                className={`nb-tk-dot tone-${STATUS_TONE[s.status] ?? 'paused'}`}
                aria-hidden
              />
              <span className="nb-tk-subtask-input">{s.input}</span>
              <span
                className={`nb-tk-subtask-status tone-${STATUS_TONE[s.status] ?? 'paused'}`}
              >
                {STATUS_LABEL[s.status] ?? s.status}
              </span>
              <span className="nb-tk-subtask-result" title={s.result ?? ''}>
                {s.result ?? ''}
              </span>
              {s.status === 'failed' && (
                <button
                  className="nb-tk-subtask-retry"
                  onClick={() => void retryRow(s.id)}
                  data-testid={`task-subtask-retry-${s.id}`}
                >
                  重试
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Action bar */}
      <div className="nb-tk-batch-actions">
        {hasFailed && (
          <button
            className="nb-tk-aux-link"
            onClick={() => void retryFailed()}
            disabled={retrying}
            data-testid="task-batch-retry-failed"
          >
            <Icons.redo size={13} />
            {retrying ? '重置中…' : `重试失败 (${progress.failed})`}
          </button>
        )}
        {subtasks.length > 0 && (
          <button
            className="nb-tk-aux-link"
            onClick={exportCsv}
            data-testid="task-batch-export-csv"
          >
            <Icons.download size={13} />
            导出 CSV
          </button>
        )}
        {!done && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-4)' }}>
            每 {POLL_MS / 1000} 秒刷新
          </span>
        )}
      </div>
    </div>
  );
}
