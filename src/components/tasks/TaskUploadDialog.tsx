// Batch-upload dialog (role=dialog): real file picker (.csv/.tsv/.txt; .xlsx
// shown as coming-soon/disabled). On file select, reads text client-side and
// POSTs to /api/tasks/batch/preview; shows parsed row count + first-N-row
// table preview + AI-detected input column + editable action description.
// Confirms via POST /api/tasks/batch, then closes and navigates to the batch
// in the all-tasks list.
//
// Change history:
//   2026-06-15  Rewrote from hardcoded preview data to real /api/tasks/batch/* endpoints.
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import { TOPICS } from '../../data/topics';

// ---------------------------------------------------------------------------
// Types matching the /api/tasks/batch/preview response
// ---------------------------------------------------------------------------

interface PreviewRow {
  fields: string[];
  lineNum: number;
}

interface PreviewResponse {
  format: string;
  headers: string[];
  hasHeader: boolean;
  totalRows: number;
  rawLineCount: number;
  previewRows: PreviewRow[];
  detection: {
    inputColumnIndex: number;
    inputColumnName: string;
    suggestedAction: string;
    fromAi: boolean;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const ACCEPT = '.csv,.tsv,.txt';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskUploadDialog({
  onClose,
  onBatchCreated,
}: {
  onClose: () => void;
  /** Called with the new batch task id once POST /api/tasks/batch succeeds. */
  onBatchCreated?: (batchId: string) => void;
}) {
  const toast = useAppStore((s) => s.toast);

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);

  // Preview state
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // User-editable fields (after preview)
  const [inputColIdx, setInputColIdx] = useState(0);
  const [action, setAction] = useState('');
  const [mode, setMode] = useState<'once' | 'daily'>('once');
  // Which topic to attach to (defaults to the first topic)
  const [topicId, setTopicId] = useState(TOPICS[0]?.id ?? 'gold');

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Cancel in-flight preview fetch when unmounting
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // ------------------------------------------------------------------
  // Read file and POST /api/tasks/batch/preview
  // ------------------------------------------------------------------

  const handleFile = useCallback(async (f: File) => {
    // Guard: reject .xlsx immediately with a user-friendly message
    if (f.name.toLowerCase().endsWith('.xlsx')) {
      setPreviewError('.xlsx 格式暂不支持，请将表格导出为 .csv 或 .tsv 后重新上传。');
      return;
    }

    setFile(f);
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);

    let text: string;
    try {
      text = await f.text();
    } catch {
      setPreviewLoading(false);
      setPreviewError('文件读取失败，请重试。');
      return;
    }
    setFileText(text);

    // Abort any previous in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch('/api/tasks/batch/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        signal: ctrl.signal,
        body: JSON.stringify({ text, filename: f.name }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `服务器返回 ${res.status}`);
      }
      const data = (await res.json()) as PreviewResponse;
      setPreview(data);
      setInputColIdx(data.detection.inputColumnIndex);
      setAction(data.detection.suggestedAction);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setPreviewError(String(err));
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // File input change
  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  // Drag and drop
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) void handleFile(f);
  };

  // ------------------------------------------------------------------
  // Submit: POST /api/tasks/batch
  // ------------------------------------------------------------------

  const submit = async () => {
    if (!file || !fileText || !preview) return;
    if (!action.trim()) {
      toast('请填写对每行要做什么');
      return;
    }
    setSubmitting(true);
    try {
      const title = `批量：${action.trim().slice(0, 40)}`;
      const body = {
        title,
        topicId,
        text: fileText,
        filename: file.name,
        inputColumnIndex: inputColIdx,
        action: action.trim(),
      };
      const res = await fetch('/api/tasks/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `服务器返回 ${res.status}`);
      }
      const data = (await res.json()) as { batchId: string; title: string; rowCount: number };
      toast(`批量任务已创建 · ${data.rowCount} 条`);
      onClose();
      onBatchCreated?.(data.batchId);
    } catch (err) {
      toast(`创建失败：${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const hasFile = !!file;
  const canSubmit = hasFile && !!preview && !!action.trim() && !submitting;

  return (
    <div
      className="nb-tk-modal-scrim"
      onClick={onClose}
      data-testid="task-upload-scrim"
    >
      <div
        className="nb-tk-modal"
        role="dialog"
        aria-modal="true"
        aria-label="上传文件批量建任务"
        onClick={(e) => e.stopPropagation()}
        data-testid="task-upload-dialog"
      >
        {/* Header */}
        <div className="nb-tk-modal-head">
          <h2>上传文件 · 批量建任务</h2>
          <button className="nb-tk-drawer-x" onClick={onClose} aria-label="关闭">
            <Icons.x size={16} />
          </button>
        </div>

        <div className="nb-tk-modal-body">
          {/* Drop zone / file picker */}
          <div
            className="nb-tk-upload-drop"
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            style={{ cursor: 'pointer' }}
            data-testid="task-upload-dropzone"
          >
            <Icons.download size={18} />
            <span>拖入或点击选择文件</span>
            <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>
              支持 .csv · .tsv · .txt&nbsp;&nbsp;
              <span style={{ opacity: 0.6 }}>.xlsx 即将支持</span>
            </span>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              onChange={onFileInput}
              style={{ display: 'none' }}
              data-testid="task-upload-input"
            />
          </div>

          {/* Selected file summary */}
          {hasFile && (
            <div className="nb-tk-upload-file">
              <Icons.doc size={16} />
              <span className="nb-tk-upload-fname">{file.name}</span>
              <span className="nb-tk-upload-fmeta">{formatBytes(file.size)}</span>
              <button
                className="nb-tk-aux-link"
                onClick={() => inputRef.current?.click()}
                data-testid="task-upload-reselect"
              >
                重新选择
              </button>
            </div>
          )}

          {/* Loading spinner */}
          {previewLoading && (
            <div className="nb-tk-upload-loading" data-testid="task-upload-loading">
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>正在解析文件…</span>
            </div>
          )}

          {/* Error */}
          {previewError && (
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--danger-soft)',
                color: 'var(--danger)',
                borderRadius: 'var(--r-2)',
                fontSize: 13,
              }}
              data-testid="task-upload-error"
            >
              {previewError}
            </div>
          )}

          {/* Field mapping + action (shown once we have a preview) */}
          {preview && (
            <div className="nb-tk-map">
              {/* Input column selector */}
              <label className="nb-tk-map-row">
                <span>主输入列</span>
                <select
                  aria-label="主输入列"
                  value={inputColIdx}
                  onChange={(e) => setInputColIdx(Number(e.target.value))}
                  data-testid="task-upload-col-select"
                >
                  {preview.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}（{i === 0 ? 'A' : String.fromCharCode(65 + i)} 列）
                    </option>
                  ))}
                </select>
              </label>

              {/* Per-row action */}
              <label className="nb-tk-map-row">
                <span>对每一行做什么</span>
                <input
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="例如：查这家公司最新融资新闻并整理摘要"
                  aria-label="对每行做什么"
                  data-testid="task-upload-action"
                />
              </label>

              {/* Topic bucket */}
              <label className="nb-tk-map-row">
                <span>归属话题</span>
                <select
                  aria-label="归属话题"
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  data-testid="task-upload-topic"
                >
                  {TOPICS.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>

              {/* Run mode */}
              <div className="nb-tk-map-row">
                <span>执行方式</span>
                <div className="nb-tk-runmode" role="radiogroup" aria-label="执行方式">
                  <button
                    role="radio"
                    aria-checked={mode === 'once'}
                    className={mode === 'once' ? 'active' : ''}
                    onClick={() => setMode('once')}
                    data-testid="task-upload-mode-once"
                  >
                    立即批量跑一次
                  </button>
                  <button
                    role="radio"
                    aria-checked={mode === 'daily'}
                    className={mode === 'daily' ? 'active' : ''}
                    onClick={() => setMode('daily')}
                    data-testid="task-upload-mode-daily"
                  >
                    每天对整批跑一遍
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preview table */}
          {preview && preview.previewRows.length > 0 && (
            <>
              <table className="nb-tk-preview">
                <thead>
                  <tr>
                    {preview.headers.map((h, i) => (
                      <th
                        key={i}
                        style={i === inputColIdx ? { color: 'var(--brand-2)' } : undefined}
                      >
                        {h}
                        {i === inputColIdx && ' ★'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.map((row, ri) => (
                    <tr key={ri}>
                      {row.fields.map((cell, ci) => (
                        <td
                          key={ci}
                          style={ci === inputColIdx ? { color: 'var(--ink)', fontWeight: 500 } : undefined}
                        >
                          {cell || <span style={{ color: 'var(--ink-4)' }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="nb-tk-preview-note">
                {preview.detection.fromAi ? 'AI 检测' : '自动检测'}已选「{preview.headers[inputColIdx]}」为主输入列 ·
                共 {preview.totalRows} 行将创建 {preview.totalRows} 个子任务
              </div>
            </>
          )}
        </div>

        {/* Footer buttons */}
        <div className="nb-tk-modal-foot">
          <button className="nb-tk-btn" onClick={onClose} data-testid="task-upload-cancel">
            取消
          </button>
          <button
            className="nb-tk-btn-primary"
            onClick={submit}
            disabled={!canSubmit}
            data-testid="task-batch-run"
            style={!canSubmit ? { opacity: 0.5, cursor: 'default' } : undefined}
          >
            {submitting ? '创建中…' : '开始批量执行'}
          </button>
        </div>
      </div>
    </div>
  );
}
