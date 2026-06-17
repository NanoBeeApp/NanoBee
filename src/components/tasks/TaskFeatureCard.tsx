// TaskFeatureCard.tsx — one "重点盯梢" featured card in the top strip. Renders
// three shapes off the same view-model: a dark live-monitor card (when the task
// carries a metric + sparkline), a batch-progress card (when it has children),
// and the default condition/schedule card (a result preview). Clicking opens the
// task's detail drawer.
import { Icons } from '../../icons/icons';
import { TpSparkline, TpTypeBadge } from './TaskAtoms';
import { toneColor, type TaskVM } from './tpModel';

export function TaskFeatureCard({ vm, onOpen }: { vm: TaskVM; onOpen: (id: string) => void }) {
  const Icon = Icons[vm.icon] ?? Icons.bolt;
  const head = (
    <div className="fhead">
      <div className="fico" style={{ background: vm.iconColor }}>
        <Icon size={17} />
      </div>
      <div className="ftitle">{vm.title}</div>
      <TpTypeBadge type={vm.type} label={vm.typeLabel} />
    </div>
  );

  // Dark live-monitor variant.
  if (vm.monitor && vm.metric) {
    return (
      <button className="tp-feat mon" onClick={() => onOpen(vm.id)}>
        {head}
        <div className="fml">{vm.metric.label}</div>
        <div className="fmv">{vm.metric.value}</div>
        <div className={'fmd ' + vm.metric.dir}>
          {vm.metric.dir === 'up' ? <Icons.trend size={13} /> : <Icons.trendDown size={13} />} {vm.metric.delta}
        </div>
        {vm.spark && <TpSparkline data={vm.spark} />}
        <div className="ffoot">
          <Icons.bolt size={12} /> 实时监控中 <span className="runs">{vm.runs} 次</span>
        </div>
      </button>
    );
  }

  // Batch-progress variant.
  if (vm.children) {
    const ok = vm.batchDone;
    const fail = vm.batchFail;
    const total = Math.max(1, vm.batchCount);
    return (
      <button className="tp-feat" onClick={() => onOpen(vm.id)}>
        {head}
        <div className="ftrigger">
          <span className="ic"><Icons.calendar size={12} /></span>
          {vm.trigger}
        </div>
        <div className="fbody">
          <div className="fbatch">
            <div className="fbar">
              <div className="ok" style={{ width: `${(ok / total) * 100}%` }} />
              <div className="err" style={{ width: `${(fail / total) * 100}%` }} />
            </div>
            <span className="bn">{ok}/{vm.batchCount}</span>
          </div>
          {vm.result && <div className="fresult" style={{ marginTop: 11 }}>{vm.result}</div>}
        </div>
        <div className="ffoot">
          <Icons.clock size={12} /> {vm.next}
          <span className="runs">{vm.runs} 次</span>
        </div>
      </button>
    );
  }

  // Default condition/schedule card.
  return (
    <button className="tp-feat" onClick={() => onOpen(vm.id)}>
      {head}
      <div className="ftrigger">
        <span className="ic">{vm.type === 'condition' ? <Icons.bolt size={12} /> : <Icons.calendar size={12} />}</span>
        {vm.trigger}
      </div>
      <div className="fbody">
        <div className="fresult">
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: 999,
              background: toneColor(vm.resultTone),
              marginRight: 7,
              verticalAlign: 1,
            }}
          />
          {vm.result ?? '等待首次运行…'}
        </div>
      </div>
      <div className="ffoot">
        <Icons.clock size={12} /> {vm.next}
        <span className="runs">{vm.runs} 次</span>
      </div>
    </button>
  );
}
