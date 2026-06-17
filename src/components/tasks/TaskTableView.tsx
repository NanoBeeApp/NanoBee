// TaskTableView.tsx — the compact table view of the manager. A scan-friendly
// grid (任务 / 类型 / 触发 / 上次运行 / 下次 / 状态); clicking a row opens the
// detail drawer. Pure render off the view-models.
import { Icons } from '../../icons/icons';
import { TpStatusBadge, TpTypeBadge } from './TaskAtoms';
import type { TaskVM } from './tpModel';

export function TaskTableView({ tasks, onOpen }: { tasks: TaskVM[]; onOpen: (id: string) => void }) {
  return (
    <div className="tp-tablewrap" data-testid="tasks-table">
      <table className="tp-table">
        <thead>
          <tr>
            <th>任务</th>
            <th>类型</th>
            <th>触发</th>
            <th>上次运行</th>
            <th>下次</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((vm) => {
            const Icon = Icons[vm.icon] ?? Icons.bolt;
            return (
              <tr key={vm.id} onClick={() => onOpen(vm.id)} data-testid={`task-trow-${vm.id}`}>
                <td>
                  <div className="tcell-task">
                    <div className="tico" style={{ background: vm.iconColor }}>
                      <Icon size={14} />
                    </div>
                    <span className="tnm">{vm.title}</span>
                  </div>
                </td>
                <td><TpTypeBadge type={vm.type} label={vm.typeLabel} /></td>
                <td className="mono">{vm.trigger}</td>
                <td className="mono">{vm.last}</td>
                <td className="mono">{vm.next}</td>
                <td><TpStatusBadge status={vm.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
