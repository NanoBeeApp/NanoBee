// TaskListRow.tsx — one row in the list view: status dot + icon + title/type +
// trigger subline, then the last-result, next-run, status badge, enable toggle
// and (for batch tasks) a child-subtask expander. Clicking the row body opens the
// detail drawer. Pure render — all state lives in the parent / URL.
import { Fragment } from 'react';
import { Icons } from '../../icons/icons';
import { TpStatusBadge, TpToggle, TpTypeBadge } from './TaskAtoms';
import { toneColor, type TaskVM } from './tpModel';

interface Props {
  vm: TaskVM;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  expanded: boolean;
  onExpand: (id: string) => void;
  onRetry: (label: string) => void;
}

export function TaskListRow({ vm, onOpen, onToggle, expanded, onExpand, onRetry }: Props) {
  const Icon = Icons[vm.icon] ?? Icons.bolt;
  const isBatch = !!vm.children;

  return (
    <Fragment>
      <div
        className={'tp-row' + (expanded ? ' open' : '')}
        onClick={() => onOpen(vm.id)}
        data-testid={`task-row-${vm.id}`}
      >
        <span className={'tp-sdot ' + vm.status} />
        <div className="tp-rico" style={{ background: vm.iconColor }}>
          <Icon size={16} />
        </div>
        <div className="tp-rmain">
          <div className="tp-rtitle">
            <span className="nm">{vm.title}</span>
            <TpTypeBadge type={vm.type} label={vm.typeLabel} />
          </div>
          <div className="tp-rtrigger">{vm.trigger}</div>
        </div>

        {vm.status === 'attention' ? (
          <div className="tp-rresult fail">
            <span className="rd" style={{ background: 'var(--danger)' }} />
            <span className="tx">{vm.failure?.reason ?? '运行失败，待处理'}</span>
          </div>
        ) : (
          <div className="tp-rresult">
            <span className="rd" style={{ background: toneColor(vm.resultTone) }} />
            <span className="tx">{vm.result ?? '等待首次运行'}</span>
          </div>
        )}

        <div className="tp-rnext">{vm.next}</div>

        <div className="tp-rright" onClick={(e) => e.stopPropagation()}>
          <TpStatusBadge status={vm.status} />
          {isBatch && (
            <button className="tp-iconbtn" title="展开子任务" onClick={() => onExpand(vm.id)}>
              <Icons.chevR size={15} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
            </button>
          )}
          <TpToggle on={vm.status === 'active'} onClick={() => onToggle(vm.id)} />
          <button
            className="tp-iconbtn"
            title="暂停 / 启用"
            onClick={() => onToggle(vm.id)}
            data-testid={`task-toggle-${vm.id}`}
          >
            {vm.status === 'active' ? <Icons.pause size={15} /> : <Icons.play size={15} />}
          </button>
        </div>
      </div>

      {isBatch &&
        expanded &&
        vm.children!.map((c, i) => (
          <div className="tp-row child" key={i} onClick={(e) => e.stopPropagation()}>
            <span className={'tp-sdot ' + (c.status === 'fail' ? 'attention' : 'active')} />
            <div className="tp-rmain" style={{ width: 'auto', flex: 1 }}>
              <div className="tp-rtitle">
                <span className="nm" style={{ fontWeight: 500 }}>{c.name}</span>
              </div>
            </div>
            <div className="tp-rnext" style={{ width: 'auto', color: c.status === 'fail' ? 'var(--danger)' : 'var(--ink-3)' }}>
              {c.note}
            </div>
            {c.status === 'fail' ? (
              <button className="tp-btn sm sec" onClick={() => onRetry(`正在重跑 · ${c.name}`)}>
                <Icons.redo size={12} /> 只重跑
              </button>
            ) : (
              <span className="tp-stbadge active" style={{ visibility: 'hidden' }}>
                <span className="d" />
                ok
              </span>
            )}
          </div>
        ))}
    </Fragment>
  );
}
