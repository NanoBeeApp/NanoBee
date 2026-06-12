// One task card in the right rail: trigger, latest result, next run and an
// on/off toggle. Paused tasks are dimmed.
import type { Task } from '../../types';
import { Icons } from '../../icons/icons';
import { Toggle } from '../common/Toggle';

interface TaskCardProps {
  k: Task;
  onToggle: (id: string) => void;
}

const RESULT_TONE_COLOR: Record<string, string> = {
  up: 'var(--success)', down: 'var(--danger)', info: 'var(--info)',
};

export function TaskCard({ k, onToggle }: TaskCardProps) {
  const paused = k.status === 'paused';
  return (
    <div className={`nb-tcard${paused ? ' paused' : ''}`} data-testid={`task-card-${k.id}`}>
      <div className="th">
        <div className="tk-ico" style={{ background: k.iconColor }}>
          {k.triggerType === 'schedule' ? <Icons.clock size={15} /> : <Icons.bolt size={15} />}
        </div>
        <div className="tt">{k.title}</div>
        <Toggle checked={!paused} onChange={() => onToggle(k.id)} testId={`task-toggle-${k.id}`} />
      </div>
      <div className="trigger">
        <span className="ic">{k.triggerType === 'schedule' ? <Icons.calendar size={12} /> : <Icons.bolt size={12} />}</span>
        {k.trigger}
      </div>
      {k.result && (
        <div className="result">
          <div className="rl">
            <span className="dot dot-success" style={{ color: RESULT_TONE_COLOR[k.resultTone ?? 'info'] }} />
            最近一次 · {k.last}
          </div>
          {k.result}
        </div>
      )}
      <div className="foot">
        <span>{paused ? '已暂停' : `下次 · ${k.next}`}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--ink-4)' }}><Icons.more size={15} /></span>
      </div>
    </div>
  );
}
