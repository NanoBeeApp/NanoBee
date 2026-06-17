// TasksView.tsx — the Tasks page, rebuilt to the NanoBee "自动盯梢" design as a
// single unified surface (no home/all split): an eyebrow + title with summary
// pills, the single-focus "一句话建任务" create bar, the "重点盯梢" featured
// strip, a toolbar (filters + search + list/table/kanban switch), and the body.
// The detail drawer, batch-upload dialog and template picker overlay on top.
//
// State is the URL (useTasksUrl): the open drawer (?task), view mode (?vm),
// filter (?f), upload dialog (?upload) and template picker (?tpl) all survive a
// refresh / deep link. Data and mutations come from the store; the view-model
// mapping (real Task → design props) lives in tpModel.
import { useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Icons } from '../../icons/icons';
import { useTasksUrl } from './useTasksUrl';
import { featuredTasks, toTaskVm, TP_SUGGEST, type TaskVM } from './tpModel';
import { TaskFeatureCard } from './TaskFeatureCard';
import { TaskListRow } from './TaskListRow';
import { TaskTableView } from './TaskTableView';
import { TaskBoardView } from './TaskBoardView';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { TaskUploadDialog } from './TaskUploadDialog';
import { TaskTemplateModal } from './TaskTemplateModal';
import '../../styles/taskpage.css';

const FILTERS: { k: string; label: string }[] = [
  { k: 'all', label: '全部' },
  { k: 'active', label: '运行中' },
  { k: 'paused', label: '已暂停' },
];

export function TasksView() {
  const url = useTasksUrl();
  const tasks = useAppStore((s) => s.tasks);
  const bootstrap = useAppStore((s) => s.bootstrap);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const composeTask = useAppStore((s) => s.composeTask);
  const toast = useAppStore((s) => s.toast);

  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const featRowRef = useRef<HTMLDivElement>(null);

  const vms = useMemo<TaskVM[]>(() => tasks.map(toTaskVm), [tasks]);
  const counts = useMemo(
    () => ({
      all: vms.length,
      active: vms.filter((t) => t.status === 'active').length,
      paused: vms.filter((t) => t.status === 'paused').length,
      attention: vms.filter((t) => t.status === 'attention').length,
    }),
    [vms],
  );

  const featured = useMemo(() => featuredTasks(vms), [vms]);
  const filter = url.filter;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vms.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false;
      if (q) return `${t.title}${t.trigger}${t.result ?? ''}`.toLowerCase().includes(q);
      return true;
    });
  }, [vms, filter, query]);

  // 'board' is the URL value the route validates; the design calls it kanban.
  const view = url.vm;
  const openVm = vms.find((t) => t.id === url.taskId) ?? null;

  const toggleExpand = (id: string) =>
    setExpanded((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    composeTask(text);
    setDraft('');
  };
  const scrollFeat = (dir: number) => featRowRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });

  // After a batch upload: refresh and open the new batch's drawer.
  const handleBatchCreated = async (batchId: string) => {
    url.closeUpload();
    await bootstrap();
    url.openTask(batchId);
  };

  return (
    <div className="tp-scroll" data-testid="tasks-page">
      <div className="tp-inner">
        {/* header */}
        <div className="tp-eyebrow">NANOBEE · 自动盯梢</div>
        <div className="tp-head">
          <h1>任务</h1>
          <div className="tp-sum">
            <span className="pill"><span className="d" style={{ background: 'var(--success)' }} />{counts.active} 运行中</span>
            {counts.attention > 0 && (
              <span className="pill"><span className="d" style={{ background: 'var(--danger)' }} />{counts.attention} 待处理</span>
            )}
            <span className="pill" style={{ color: 'var(--ink-4)' }}>共 {counts.all} 个</span>
          </div>
        </div>

        {/* 单一焦点：一句话建任务 */}
        <div className="tp-create">
          <div className="tp-create-row">
            <div className="glyph"><Icons.bee size={17} /></div>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="今天想让 NanoBee 帮你盯点什么？比如「黄金跌超 2% 提醒我」"
              data-testid="task-create-input"
            />
            <button className="cbtn" title="上传文件批量建任务" onClick={url.openUpload} data-testid="task-upload-open">
              <Icons.attach size={18} />
            </button>
            <button className="send" disabled={!draft.trim()} onClick={submit} data-testid="task-create-send">
              <Icons.send size={17} />
            </button>
          </div>
          <div className="tp-create-foot">
            {TP_SUGGEST.map((s, i) => {
              const Chip = Icons[s.ic] ?? Icons.bolt;
              return (
                <button className="tp-chip" key={i} onClick={() => setDraft(s.t)}>
                  <span className="ic"><Chip size={13} /></span>{s.t}
                </button>
              );
            })}
            <span className="hint">一句话 · 零配置 · AI 自动编译触发规则</span>
          </div>
        </div>

        {/* 顶部高频卡片 */}
        {featured.length > 0 && (
          <>
            <div className="tp-sec-head">
              <span className="lbl">重点盯梢</span>
              <span className="cnt">{featured.length} 个高频任务</span>
              <div className="nav">
                <button onClick={() => scrollFeat(-1)} aria-label="向左滚动"><Icons.chevR size={15} style={{ transform: 'rotate(180deg)' }} /></button>
                <button onClick={() => scrollFeat(1)} aria-label="向右滚动"><Icons.chevR size={15} /></button>
              </div>
            </div>
            <div className="tp-feat-row" ref={featRowRef} data-testid="tasks-featured">
              {featured.map((vm) => <TaskFeatureCard key={vm.id} vm={vm} onOpen={url.openTask} />)}
            </div>
          </>
        )}

        {/* toolbar */}
        <div className="tp-toolbar">
          <div className="tp-filters">
            {FILTERS.map((f) => (
              <button
                key={f.k}
                className={'tp-fchip' + (filter === f.k ? ' active' : '')}
                onClick={() => url.setFilter(f.k)}
                data-testid={`task-filter-${f.k}`}
              >
                {f.label}<span className="n">{counts[f.k as keyof typeof counts]}</span>
              </button>
            ))}
            {counts.attention > 0 && (
              <button
                className={'tp-fchip warn' + (filter === 'attention' ? ' active' : '')}
                onClick={() => url.setFilter('attention')}
                data-testid="task-filter-attention"
              >
                <span className="dotmini" />需处理<span className="n">{counts.attention}</span>
              </button>
            )}
          </div>
          <div className="tp-search">
            <span className="ic"><Icons.search size={15} /></span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索任务…" data-testid="task-search" />
          </div>
          <div className="tp-viewseg">
            <button className={view === 'list' ? 'active' : ''} onClick={() => url.setVm('list')} data-testid="task-vm-list"><Icons.list size={15} /> 列表</button>
            <button className={view === 'table' ? 'active' : ''} onClick={() => url.setVm('table')} data-testid="task-vm-table"><Icons.table size={15} /> 表格</button>
            <button className={view === 'board' ? 'active' : ''} onClick={() => url.setVm('board')} data-testid="task-vm-board"><Icons.grid size={15} /> 看板</button>
          </div>
        </div>

        {/* body */}
        {filtered.length === 0 ? (
          <div className="tp-list">
            <div className="tp-empty-mini" style={{ padding: '48px 12px', fontSize: 13 }}>
              没有符合条件的任务。<br />试试在上面用一句话新建一个 →
            </div>
          </div>
        ) : view === 'list' ? (
          <div className="tp-list" data-testid="tasks-list">
            {filtered.map((vm) => (
              <TaskListRow
                key={vm.id}
                vm={vm}
                onOpen={url.openTask}
                onToggle={toggleTask}
                expanded={expanded.includes(vm.id)}
                onExpand={toggleExpand}
                onRetry={toast}
              />
            ))}
          </div>
        ) : view === 'table' ? (
          <TaskTableView tasks={filtered} onOpen={url.openTask} />
        ) : (
          <TaskBoardView tasks={filtered} onOpen={url.openTask} />
        )}
      </div>

      {url.taskId && <TaskDetailDrawer vm={openVm} onClose={url.closeTask} />}
      {url.uploadOpen && (
        <TaskUploadDialog onClose={url.closeUpload} onBatchCreated={(id) => void handleBatchCreated(id)} />
      )}
      {url.tplCategory !== null && (
        <TaskTemplateModal
          activeCategoryId={url.tplCategory}
          onChangeCategory={url.setTplCategory}
          onClose={url.closeTemplate}
        />
      )}
    </div>
  );
}
