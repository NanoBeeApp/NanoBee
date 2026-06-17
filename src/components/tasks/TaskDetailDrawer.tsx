// TaskDetailDrawer.tsx — the right-side detail drawer for one task, rebuilt to
// the NanoBee design. Top to bottom: header (icon + title + status/topic +
// run-count), the "对话即配置" natural-language trigger spec with an editable
// line and a collapsible structured-fields escape hatch, the batch subtasks
// (when present), the latest result / failure block, the run-history timeline,
// and the action bar (run now / continue chat / pause-resume / delete).
//
// The run history prefers the real server timeline (GET /api/tasks/:id/runs) and
// falls back to the view-model's derived history for seed/legacy tasks. Opened
// via the URL ?task=id so it survives refresh and deep links.
import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import { TpStatusBadge } from './TaskAtoms';
import { TP_RUN, toneColor, type TaskVM, type TpRun } from './tpModel';

// ── server run-history wire types (GET /api/tasks/:id/runs) ─────────────────
interface RunWire {
  id: string;
  startedAt: number;
  status: 'ok' | 'failed' | 'skipped';
  summaryText: string | null;
  errorText: string | null;
}

function relativeTime(unixSec: number): string {
  const diffSec = Math.floor(Date.now() / 1000) - unixSec;
  if (diffSec < 60) return '刚刚';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} 小时前`;
  if (diffSec < 86400 * 2) return '昨天';
  return `${Math.floor(diffSec / 86400)} 天前`;
}

/** Server runs → the design's run-history rows, falling back to the VM's. */
function useRunHistory(taskId: string, fallback: TpRun[]): TpRun[] {
  const [rows, setRows] = useState<TpRun[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/runs?limit=10&offset=0`, {
          credentials: 'same-origin',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { runs: RunWire[] };
        if (cancelled) return;
        setRows(
          data.runs.map((r) => ({
            time: relativeTime(r.startedAt),
            status: r.status === 'failed' ? 'fail' : r.status === 'skipped' ? 'skipped' : 'success',
            summary: (r.status === 'failed' ? r.errorText : r.summaryText) ?? TP_RUN[r.status === 'failed' ? 'fail' : 'success'],
          })),
        );
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => { cancelled = true; };
  }, [taskId]);
  // Use server rows when it returned any; otherwise the derived fallback.
  return rows && rows.length ? rows : fallback;
}

export function TaskDetailDrawer({ vm, onClose }: { vm: TaskVM | null; onClose: () => void }) {
  const toggleTask = useAppStore((s) => s.toggleTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const openChat = useAppStore((s) => s.openChat);
  const toast = useAppStore((s) => s.toast);
  const [esc, setEsc] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Hooks must run unconditionally — call before the null guard.
  const runHistory = useRunHistory(vm?.id ?? '', vm?.runHistory ?? []);
  if (!vm) return null;

  const Icon = Icons[vm.icon] ?? Icons.bolt;
  const fields: [string, string][] = [
    ['触发类型', `${vm.typeLabel} · ${vm.type === 'condition' ? '条件触发' : vm.type === 'batch' ? '批量' : '定时'}`],
    [vm.type === 'condition' ? '条件' : '调度', vm.trigger],
    ['冷却', vm.cooldown],
    ['通知渠道', vm.channel],
    ['数据源', vm.source],
  ];

  return (
    <>
      <div className="tp-scrim" onClick={onClose} data-testid="task-detail-scrim" />
      <aside className="tp-drawer" role="dialog" aria-modal="true" aria-label="任务详情" data-testid="task-detail-drawer">
        <div className="tp-dhead">
          <div className="dico" style={{ background: vm.iconColor }}>
            <Icon size={19} />
          </div>
          <div className="dt">
            <h3>{vm.title}</h3>
            <div className="dsub">
              <TpStatusBadge status={vm.status} />
              {vm.topicName && (
                <span className="tp-tbadge" style={{ background: 'var(--surface-3)', color: 'var(--ink-3)' }}>
                  {vm.topicName}
                </span>
              )}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                {vm.runs} 次运行 · {vm.successRate}
              </span>
            </div>
          </div>
          <button className="tp-dclose" onClick={onClose} aria-label="关闭">
            <Icons.x size={17} />
          </button>
        </div>

        <div className="tp-dbody">
          {/* 对话即配置 */}
          <div className="tp-dsec">
            <div className="tp-dlabel">触发规格 · 一句话<span className="ln" /></div>
            <div className="tp-nlspec">
              <div className="qt">{vm.nlSpec}</div>
              <div className="nl-edit">
                <span className="ic"><Icons.bee size={15} /></span>
                <input
                  placeholder="用自然语言修改，如「阈值改成 3%」"
                  onKeyDown={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    if (e.key === 'Enter' && v.trim()) {
                      toast('已按你的描述更新触发规则');
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>
            </div>
            {/* 逃生舱：结构化字段 */}
            <div className={'tp-escape' + (esc ? ' open' : '')}>
              <div className="tp-escape-head" onClick={() => setEsc((v) => !v)}>
                <Icons.gear size={14} /> 结构化字段
                <span style={{ color: 'var(--ink-4)', fontWeight: 400, fontSize: 11 }}>（进阶 · 逃生舱）</span>
                <span className="chev"><Icons.chevD size={15} /></span>
              </div>
              {esc && (
                <div className="tp-escape-body">
                  {fields.map((f, i) => (
                    <div className="tp-frow" key={i}>
                      <span className="fk">{f[0]}</span>
                      <span className="fv">{f[1]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 子任务 */}
          {vm.children && (
            <div className="tp-dsec">
              <div className="tp-dlabel">
                子任务 · {vm.batchDone}/{vm.batchCount} 成功<span className="ln" />
                {vm.batchFail > 0 && (
                  <button className="tp-btn sm sec" onClick={() => toast(`正在重跑 ${vm.batchFail} 个失败项`)}>
                    <Icons.redo size={12} /> 重跑失败项
                  </button>
                )}
              </div>
              <div className="tp-children">
                {vm.children.map((c, i) => (
                  <div className={'tp-crow' + (c.status === 'fail' ? ' fail' : '')} key={i}>
                    <span className={'tp-sdot ' + (c.status === 'fail' ? 'attention' : 'active')} />
                    <span className="cnm">{c.name}</span>
                    <span className="cnote">{c.note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 最近结果 / 失败 */}
          <div className="tp-dsec">
            <div className="tp-dlabel">
              {vm.status === 'attention' ? '需要你处理' : '最近一次结果'} · {vm.last}<span className="ln" />
            </div>
            {vm.status === 'attention' && vm.failure ? (
              <div className="tp-dfail">
                <div className="frow1"><Icons.bell size={15} /> 任务运行失败</div>
                <div className="why">{vm.failure.reason}</div>
                <div className="fix">
                  <span className="ic"><Icons.spark size={15} /></span>
                  <div><b>NanoBee 建议：</b>{vm.failure.fix}</div>
                </div>
              </div>
            ) : (
              <div className="tp-dresult">
                <span
                  style={{
                    display: 'inline-block', width: 7, height: 7, borderRadius: 999,
                    background: toneColor(vm.resultTone), marginRight: 8, verticalAlign: 1,
                  }}
                />
                {vm.result ?? '任务已创建，等待首次运行。'}
              </div>
            )}
          </div>

          {/* 运行历史 */}
          {runHistory.length > 0 && (
            <div className="tp-dsec">
              <div className="tp-dlabel">运行历史<span className="ln" /></div>
              <div className="tp-tl" data-testid="task-detail-history">
                {runHistory.map((r, i) => (
                  <div className="tp-tlitem" key={i}>
                    <span className={'tldot ' + r.status} />
                    <div className="tltime">{r.time}<span className={'st ' + r.status}>{TP_RUN[r.status]}</span></div>
                    <div className="tlsum">{r.summary}</div>
                    {r.status === 'fail' && (
                      <div className="tlretry">
                        <button className="tp-btn sm sec" onClick={() => toast('正在重跑该次失败任务')}>
                          <Icons.redo size={12} /> 重跑这次
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="tp-dfoot">
          <button className="tp-btn primary" onClick={() => toast(`已手动触发 · ${vm.title}`)} data-testid="task-run-now">
            <Icons.play size={13} /> 立即运行
          </button>
          <button className="tp-btn sec" onClick={() => { openChat(); onClose(); }}>
            <Icons.chat size={13} /> 继续聊
          </button>
          <button className="tp-btn sec" onClick={() => toggleTask(vm.id)} data-testid="task-toggle-pause">
            {vm.status === 'active' ? <><Icons.pause size={13} /> 暂停</> : <><Icons.play size={13} /> 启用</>}
          </button>
          <button
            className="tp-btn ghost danger"
            style={{ marginLeft: 'auto' }}
            onClick={() => { deleteTask(vm.id); onClose(); }}
            data-testid="task-delete"
          >
            <Icons.x size={13} /> 删除
          </button>
        </div>
      </aside>
    </>
  );
}
