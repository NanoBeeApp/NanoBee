// TaskBoardView.tsx — the kanban view of the manager: tasks grouped into three
// status columns (运行中 / 需处理 / 已暂停). Light columns, gaps not rules; each
// card is compact (icon + title + trigger + result). Clicking a card opens the
// detail drawer. Empty columns show a pale placeholder. Pure render.
import { Icons } from '../../icons/icons';
import { TP_STAT, type TaskVM, type TpStatus } from './tpModel';

const COLUMNS: { key: TpStatus; label: string }[] = [
  { key: 'active', label: '运行中' },
  { key: 'attention', label: '需处理' },
  { key: 'paused', label: '已暂停' },
];

export function TaskBoardView({ tasks, onOpen }: { tasks: TaskVM[]; onOpen: (id: string) => void }) {
  return (
    <div className="tp-kanban" data-testid="tasks-board">
      {COLUMNS.map((col) => {
        const list = tasks.filter((t) => t.status === col.key);
        return (
          <div className="tp-kcol" key={col.key}>
            <div className="tp-kcol-head">
              <span className="d" style={{ background: TP_STAT[col.key].kdot }} />
              {col.label}
              <span className="c">{list.length}</span>
            </div>
            {list.length === 0 && <div className="tp-empty-mini">无</div>}
            {list.map((vm) => {
              const Icon = Icons[vm.icon] ?? Icons.bolt;
              return (
                <div className="tp-kcard" key={vm.id} onClick={() => onOpen(vm.id)} data-testid={`task-card-${vm.id}`}>
                  <div className="kh">
                    <div className="kico" style={{ background: vm.iconColor }}>
                      <Icon size={14} />
                    </div>
                    <div className="kt">{vm.title}</div>
                  </div>
                  <div className="ktr">{vm.trigger}</div>
                  {vm.status === 'attention' ? (
                    <div className="kr fail">{vm.failure?.reason ?? '运行失败'}</div>
                  ) : (
                    vm.result && <div className="kr">{vm.result}</div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
