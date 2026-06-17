// TaskAtoms.tsx — the small shared primitives the Tasks-page renderers reuse:
// the enable toggle, the status badge, the type badge, and the monitor-card
// sparkline. Kept together (and pure) so the row / card / table / kanban /
// drawer all render identical chrome.
import { TP_STAT, type TaskVM, type TpType } from './tpModel';

const TYPE_LABEL: Record<TpType, string> = { schedule: '定时', condition: '条件', batch: '批量' };

/** A compact on/off toggle (the row enable switch). */
export function TpToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <div
      className={'tp-toggle' + (on ? ' on' : '')}
      onClick={onClick}
      role="switch"
      aria-checked={on}
    >
      <span className="knob" />
    </div>
  );
}

/** The active / paused / attention status pill. */
export function TpStatusBadge({ status }: { status: TaskVM['status'] }) {
  const s = TP_STAT[status] ?? TP_STAT.active;
  return (
    <span className={'tp-stbadge ' + s.badge}>
      <span className="d" />
      {s.label}
    </span>
  );
}

/** The schedule / condition / batch type badge. */
export function TpTypeBadge({ type, label }: { type: TpType; label?: string }) {
  return <span className={'tp-tbadge ' + type}>{label ?? TYPE_LABEL[type]}</span>;
}

/** A filled-area sparkline for the dark monitor featured card. */
export function TpSparkline({ data }: { data: number[] }) {
  const w = 248;
  const h = 42;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, ((v - min) / span) * h]);
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  const col = '#6fd99a';
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height: 40, marginTop: 10, display: 'block' }}
    >
      <polygon points={area} fill={col} opacity="0.14" />
      <polyline points={line} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
