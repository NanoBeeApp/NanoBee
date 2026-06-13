// Compact list row on the Today page; expands inline to the full body.
import type { UpdateItem } from '../../types';
import { Icon, Icons } from '../../icons/icons';
import { ReadBody, type ReadItemActions } from './ReadBody';

interface ReadRowProps extends ReadItemActions {
  item: UpdateItem;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
}

export function ReadRow({ item, expanded, onToggleExpand, onOpenChat }: ReadRowProps) {
  return (
    <div className="nb-read-row" data-cid={item.id}
      data-testid={`read-row-${item.id}`}>
      <div className="nb-read-row-head" onClick={() => onToggleExpand(item.id)}>
        <span className="rico" style={{ background: item.color }}><Icon name={item.icon} size={13} /></span>
        <span className="rtitle">{item.title}</span>
        {!expanded && <span className="rsum">{item.summary}</span>}
        <span className="rtime">{item.time}</span>
        <span style={{ color: 'var(--ink-4)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-2) var(--ease-out)', flexShrink: 0, display: 'inline-flex' }}>
          <Icons.chevR size={14} />
        </span>
      </div>
      {expanded && <ReadBody item={item} onOpenChat={onOpenChat} />}
    </div>
  );
}
