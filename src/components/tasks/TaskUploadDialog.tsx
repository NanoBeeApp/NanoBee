// Batch-upload dialog (role=dialog): pick a file, map the primary input column +
// the per-row action, choose a run mode, preview, then "开始批量执行". The dialog
// caps its height and scrolls its body so the preview + footer buttons stay
// visible. Confirming surfaces a toast — the real per-row execution pipeline
// (parsing, scheduling, concurrency, retries) is a later backend concern.
import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';

export function TaskUploadDialog({ onClose }: { onClose: () => void }) {
  const toast = useAppStore((s) => s.toast);
  const [mode, setMode] = useState<'once' | 'daily'>('once');

  // Close on Escape (modal convention + a11y).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const start = () => {
    toast('批量任务已创建，执行管线开发中');
    onClose();
  };

  return (
    <div className="nb-tk-modal-scrim" onClick={onClose} data-testid="task-upload-scrim">
      <div
        className="nb-tk-modal"
        role="dialog"
        aria-modal="true"
        aria-label="上传文件批量建任务"
        onClick={(e) => e.stopPropagation()}
        data-testid="task-upload-dialog"
      >
        <div className="nb-tk-modal-head">
          <h2>上传文件 · 批量建任务</h2>
          <button className="nb-tk-drawer-x" onClick={onClose} aria-label="关闭">
            <Icons.x size={16} />
          </button>
        </div>

        <div className="nb-tk-modal-body">
          <div className="nb-tk-upload-drop">
            <Icons.download size={18} />
            <span>拖入或点击选择 .xlsx / .csv / 文档，可多选</span>
          </div>
          <div className="nb-tk-upload-file">
            <Icons.doc size={16} />
            <span className="nb-tk-upload-fname">companies.xlsx</span>
            <span className="nb-tk-upload-fmeta">100 行 · 12 KB</span>
            <button className="nb-tk-aux-link">重新选择</button>
          </div>

          <div className="nb-tk-map">
            <label className="nb-tk-map-row">
              <span>主输入列</span>
              <select aria-label="主输入列" defaultValue="b">
                <option value="b">公司名（B 列）</option>
                <option value="c">行业（C 列）</option>
                <option value="d">官网（D 列）</option>
              </select>
            </label>
            <label className="nb-tk-map-row">
              <span>对每一行做什么</span>
              <input
                defaultValue="查这家公司最新一轮融资新闻并整理摘要"
                aria-label="对每行做什么"
              />
            </label>
            <div className="nb-tk-map-row">
              <span>执行方式</span>
              <div className="nb-tk-runmode" role="radiogroup" aria-label="执行方式">
                <button
                  role="radio"
                  aria-checked={mode === 'once'}
                  className={mode === 'once' ? 'active' : ''}
                  onClick={() => setMode('once')}
                >
                  立即批量跑一次
                </button>
                <button
                  role="radio"
                  aria-checked={mode === 'daily'}
                  className={mode === 'daily' ? 'active' : ''}
                  onClick={() => setMode('daily')}
                >
                  每天对整批跑一遍
                </button>
              </div>
            </div>
          </div>

          <table className="nb-tk-preview">
            <thead>
              <tr>
                <th>公司名（B 列）</th>
                <th>行业（C 列）</th>
                <th>官网（D 列）</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>字节跳动</td>
                <td>互联网</td>
                <td>bytedance.com</td>
              </tr>
              <tr>
                <td>美团</td>
                <td>本地生活</td>
                <td>meituan.com</td>
              </tr>
              <tr>
                <td>小红书</td>
                <td>社交电商</td>
                <td>xiaohongshu.com</td>
              </tr>
            </tbody>
          </table>
          <div className="nb-tk-preview-note">共 100 行将创建 100 个子任务</div>
        </div>

        <div className="nb-tk-modal-foot">
          <button className="nb-tk-btn" onClick={onClose}>
            取消
          </button>
          <button className="nb-tk-btn-primary" onClick={start} data-testid="task-batch-run">
            开始批量执行
          </button>
        </div>
      </div>
    </div>
  );
}
