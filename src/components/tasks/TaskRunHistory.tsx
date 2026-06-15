// TaskRunHistory — lazy-fetched run timeline shown in TaskDetailDrawer.
//
// Fetches GET /api/tasks/:id/runs when the component first mounts (i.e. when
// the drawer opens). Shows status dot, relative time, and the summary or
// plain-language failure text. A "加载更多" button handles pagination.
//
// Status dot colours follow the existing nb-tk-trun CSS convention:
//   ok      → tone-active  (green)
//   failed  → tone-failed  (red)
//   skipped → tone-paused  (gray)
//
// Change history:
//   2026-06-15  Created for task-reliability milestone (migration 0019).
import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Wire types (shape returned by GET /api/tasks/:id/runs)
// ---------------------------------------------------------------------------

interface RunWire {
  id: string;
  taskId: string;
  startedAt: number;    // unix seconds
  finishedAt: number | null;
  status: 'ok' | 'failed' | 'skipped';
  summaryText: string | null;
  errorText: string | null;
}

interface RunsResponse {
  runs: RunWire[];
  total: number;
  limit: number;
  offset: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map run status to the CSS tone class used by existing .nb-tk-trun styles. */
function statusTone(status: RunWire['status']): string {
  switch (status) {
    case 'ok':
      return 'active';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'paused';
    default:
      return 'paused';
  }
}

/** Short human label for the status. */
function statusLabel(status: RunWire['status']): string {
  switch (status) {
    case 'ok':
      return '成功';
    case 'failed':
      return '失败';
    case 'skipped':
      return '跳过';
    default:
      return status;
  }
}

/**
 * Format a unix timestamp as a short relative string in Chinese.
 * Examples: "刚刚", "3 分钟前", "2 小时前", "昨天", "3 天前".
 */
function relativeTime(unixSec: number): string {
  const diffSec = Math.floor(Date.now() / 1000) - unixSec;
  if (diffSec < 60) return '刚刚';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} 小时前`;
  if (diffSec < 86400 * 2) return '昨天';
  return `${Math.floor(diffSec / 86400)} 天前`;
}

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskRunHistory({ taskId }: { taskId: string }) {
  const [runs, setRuns] = useState<RunWire[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  // Track mount state to avoid setState after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch one page of runs. Appends to existing list for "load more".
  const fetchRuns = useCallback(
    async (pageOffset: number) => {
      if (!mountedRef.current) return;
      setLoading(true);
      setError(null);
      try {
        const url = `/api/tasks/${encodeURIComponent(taskId)}/runs?limit=${PAGE_SIZE}&offset=${pageOffset}`;
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as RunsResponse;
        if (!mountedRef.current) return;
        setRuns((prev) => (pageOffset === 0 ? data.runs : [...prev, ...data.runs]));
        setTotal(data.total);
        setOffset(pageOffset + data.runs.length);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(String(err));
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [taskId],
  );

  // Initial load when drawer opens (or task changes).
  useEffect(() => {
    setRuns([]);
    setTotal(0);
    setOffset(0);
    void fetchRuns(0);
  }, [fetchRuns]);

  const hasMore = offset < total;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  if (loading && runs.length === 0) {
    return (
      <div
        style={{ padding: '10px 0', fontSize: 12, color: 'var(--ink-4)' }}
        data-testid="task-runs-loading"
      >
        加载中…
      </div>
    );
  }

  if (error && runs.length === 0) {
    return (
      <div
        style={{
          padding: '8px 12px',
          background: 'var(--danger-soft)',
          color: 'var(--danger)',
          borderRadius: 'var(--r-2)',
          fontSize: 12,
        }}
        data-testid="task-runs-error"
      >
        无法加载运行历史：{error}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div
        style={{ padding: '10px 0', fontSize: 12, color: 'var(--ink-4)' }}
        data-testid="task-runs-empty"
      >
        暂无运行记录。任务首次执行后会在这里显示。
      </div>
    );
  }

  return (
    <div data-testid="task-run-history">
      <ul className="nb-tk-timeline" data-testid="task-detail-history">
        {runs.map((run) => (
          <li
            key={run.id}
            className={`nb-tk-trun tone-${statusTone(run.status)}`}
            data-testid={`task-history-row-${run.id}`}
            title={run.errorText ?? run.summaryText ?? ''}
          >
            <span className="nb-tk-trun-dot" aria-hidden />
            <span
              className="nb-tk-trun-time"
              title={new Date(run.startedAt * 1000).toLocaleString()}
            >
              {relativeTime(run.startedAt)}
            </span>
            <span className="nb-tk-trun-sum">
              {/* For failures, prefer the plain-language error; otherwise show summary. */}
              {run.status === 'failed' && run.errorText
                ? run.errorText
                : (run.summaryText ?? statusLabel(run.status))}
            </span>
          </li>
        ))}
      </ul>

      {/* Load more */}
      {hasMore && (
        <button
          className="nb-tk-aux-link"
          style={{ marginTop: 6, fontSize: 12 }}
          onClick={() => void fetchRuns(offset)}
          disabled={loading}
          data-testid="task-runs-load-more"
        >
          {loading ? '加载中…' : `加载更多（还有 ${total - offset} 条）`}
        </button>
      )}

      {/* Inline error when load-more fails */}
      {error && runs.length > 0 && (
        <div
          style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}
          data-testid="task-runs-error-inline"
        >
          加载失败：{error}
        </div>
      )}
    </div>
  );
}
