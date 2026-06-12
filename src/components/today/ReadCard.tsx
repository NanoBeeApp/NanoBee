// Grid card on the Today page; expands to full width with the complete body
// (expanding marks the item as read).
import type { UpdateItem } from '../../types';
import { topicById, topicShortName } from '../../data/topics';
import { Icon } from '../../icons/icons';
import { ReadBody, type ReadItemActions } from './ReadBody';

interface ReadCardProps extends ReadItemActions {
  item: UpdateItem;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
}

export function ReadCard({ item, expanded, onToggleExpand, onOpenChat, onToggleRead }: ReadCardProps) {
  const t = topicById(item.topicId);
  return (
    <div className={`nb-read-card${item.unread ? ' unread' : ' read'}${expanded ? ' expanded' : ''}`}
      data-rid={item.unread ? item.id : undefined} data-cid={item.id}
      onClick={() => !expanded && onToggleExpand(item.id)}
      data-testid={`read-card-${item.id}`}>
      <div className="chead">
        <span className="rico" style={{ background: item.color }}><Icon name={item.icon} size={14} /></span>
        {t && <span className="badge" style={{ background: t.soft, color: t.color, border: 'none' }}>{topicShortName(t)}</span>}
        <span className="ctime">{item.time}</span>
      </div>
      <div className="ctitle">{item.title}</div>
      {!expanded && <div className="csum">{item.summary}</div>}
      {item.unread && !expanded && <span className="cdot" />}
      {expanded && (
        <>
          <ReadBody item={item} onOpenChat={onOpenChat} onToggleRead={onToggleRead} />
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
            onClick={(e) => { e.stopPropagation(); onToggleExpand(item.id); }}
            data-testid={`collapse-read-card-${item.id}`}>
            收起
          </button>
        </>
      )}
    </div>
  );
}
